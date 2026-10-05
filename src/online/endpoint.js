export function socketURL(configured, pageURL) {
  const page=new URL(pageURL);
  const url=new URL(configured?.trim()||'/socket',page);
  if(!['http:','https:','ws:','wss:'].includes(url.protocol)||url.username||url.password||url.hash)
    throw new Error('The online server address is invalid.');
  url.protocol=['https:','wss:'].includes(url.protocol)?'wss:':'ws:';
  if(page.protocol==='https:'&&url.protocol!=='wss:')
    throw new Error('Online play needs a secure game server address.');
  if(url.pathname==='/')url.pathname='/socket';
  return url.href;
}
