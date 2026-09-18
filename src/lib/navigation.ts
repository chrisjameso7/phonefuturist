type Access={active:boolean;verified:boolean;roles:string[]};
export function navigationFor(user:unknown,access:Access|null){
 return {signedIn:!!user,showStudio:!!user&&!!access?.active&&!!access.verified&&access.roles.includes('admin')};
}
