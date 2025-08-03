export function cn(...classes:(string|false|undefined)[]){ return classes.filter(Boolean).join(' ') }
export function asciiId(s:string){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') }
