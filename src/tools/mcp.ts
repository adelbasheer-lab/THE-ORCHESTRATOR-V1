import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { AgentTools, ToolDefinition } from "./toolset.js";
export interface RemoteMcpConfig{name:string;url:string;authToken?:string;readOnly?:boolean;allowedTools?:string[];}
export class McpToolPlane implements AgentTools{
 private clients=new Map<string,{client:Client;allowedTools:Set<string>}>();
 readonly definitions:ToolDefinition[]=[];private initialized=false;
 constructor(private configs:RemoteMcpConfig[]=[],private allowWrites=false){}
 async initialize(){if(this.initialized)return;for(const cfg of this.configs){
  if(!/^https:\/\//i.test(cfg.url))throw new Error("MCP URL must use HTTPS");
  const client=new Client({name:"orchestrator-v1",version:"0.1.0"});const opts=cfg.authToken?{requestInit:{headers:{Authorization:"Bearer "+cfg.authToken}}}:undefined;
  const transport=new StreamableHTTPClientTransport(new URL(cfg.url),opts);await client.connect(transport);const listed=await client.listTools();const configured=new Set(cfg.allowedTools||[]);
  const allowed=new Set((listed.tools as any[]).filter(t=>configured.size===0||configured.has(t.name)).filter(t=>this.allowWrites||cfg.readOnly===true).map(t=>t.name));
  this.clients.set(cfg.name,{client,allowedTools:allowed});
  for(const tool of listed.tools as any[])if(allowed.has(tool.name))this.definitions.push({name:"mcp__"+cfg.name+"__"+tool.name,description:"[MCP:"+cfg.name+"] "+(tool.description||tool.name),inputSchema:tool.inputSchema||{type:"object",properties:{}},strict:false});
 }this.initialized=true;}
 async execute(name:string,input:Record<string,unknown>){await this.initialize();const parts=name.split("__");if(parts.length<3||parts[0]!=="mcp")throw new Error("Unknown MCP tool: "+name);const toolName=parts.slice(2).join("__"),entry=this.clients.get(parts[1]);if(!entry||!entry.allowedTools.has(toolName))throw new Error("MCP tool not allowed");return JSON.stringify(await entry.client.callTool({name:toolName,arguments:input}));}
}
export class CompositeToolset implements AgentTools{readonly definitions:ToolDefinition[];constructor(private sets:AgentTools[]){this.definitions=sets.flatMap(s=>s.definitions);}async execute(name:string,input:Record<string,unknown>){const set=this.sets.find(s=>s.definitions.some(d=>d.name===name));if(!set)throw new Error("Tool not found: "+name);return set.execute(name,input);}}
