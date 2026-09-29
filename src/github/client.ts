import { Octokit } from "@octokit/rest";
export interface PullRequestInfo { number:number; url:string; }
export class GitHubClient {
 private octokit:any;
 constructor(token=process.env.GITHUB_TOKEN){if(!token)throw new Error("GITHUB_TOKEN is not configured");this.octokit=new Octokit({auth:token});}
 async createPullRequest(repoFullName:string,base:string,head:string,title:string,body:string):Promise<PullRequestInfo>{const [owner,repo]=splitRepo(repoFullName);const {data}=await this.octokit.pulls.create({owner,repo,base,head,title,body,draft:false});return {number:data.number,url:data.html_url};}
 async mergePullRequest(repoFullName:string,prNumber:number):Promise<void>{const [owner,repo]=splitRepo(repoFullName);await this.octokit.pulls.merge({owner,repo,pull_number:prNumber,merge_method:"squash"});}
 async getPullRequest(repoFullName:string,prNumber:number):Promise<{state:string;merged:boolean;mergeable:boolean|null}>{const [owner,repo]=splitRepo(repoFullName);const {data}=await this.octokit.pulls.get({owner,repo,pull_number:prNumber});return {state:data.state,merged:data.merged,mergeable:data.mergeable};}
}
function splitRepo(repoFullName:string):[string,string]{const [owner,repo]=repoFullName.split("/");if(!owner||!repo)throw new Error(`Invalid repository: ${repoFullName}`);return [owner,repo];}