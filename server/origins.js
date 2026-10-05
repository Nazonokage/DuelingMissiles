export function allowedOrigins(value='') {
  return new Set(value.split(',').map(s=>s.trim()).filter(Boolean).map(s=>{
    const url=new URL(s);
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)
      throw new Error('PUBLIC_ORIGINS must contain exact HTTP(S) origins separated by commas.');
    return url.origin;
  }));
}

export function acceptsOrigin(origin,host,allowed) {
  if(!origin)return true; // Native clients still authenticate through the lobby protocol.
  try {
    const url=new URL(origin);
    return ['http:','https:'].includes(url.protocol)&&url.origin===origin&&
      (url.host===host||allowed.has(origin));
  } catch {return false;}
}
