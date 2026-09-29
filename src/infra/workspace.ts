import { mkdir,rm } from "node:fs/promises";import { join } from "node:path";import { gitClone,gitCommitAndPush,gitCreateBranch } from "../tools/git.js";
export class WorkspaceManager{
 constructor(private root=process.env.WORKSPACE_ROOT||".workspaces"){}
 async create(taskId:string,repository:string,baseBranch:string){const root=join(this.root,taskId);await mkdir(this.root,{recursive:true});await rm(root,{recursive:true,force:true});await gitClone(repository,root,baseBranch,process.env.GITHUB_TOKEN);const branch="orchestrator/task-"+taskId;await gitCreateBranch(root,branch);return {path:root,branch};}
 async commitAndPush(path:string,branch:string,message:string){return gitCommitAndPush(path,message,branch,process.env.GITHUB_TOKEN);}
 async remove(path:string){await rm(path,{recursive:true,force:true});}
}