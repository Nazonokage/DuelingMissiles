export const COUNTRIES={
 italy:{name:'Italy',flag:'🇮🇹',color:0x38885d,music:'paper-parade',stripes:['#009246','#fff','#ce2b37'],vertical:true},
 france:{name:'France',flag:'🇫🇷',color:0x406cc4,music:'signal-waltz',stripes:['#002395','#fff','#ed2939'],vertical:true},
 finland:{name:'Finland',flag:'🇫🇮',color:0x5187a5,music:'night-radar',cross:'#003580'},
 uk:{name:'United Kingdom',flag:'🇬🇧',color:0x8d528e,music:'central-march',union:true},
 germany:{name:'Germany',flag:'🇩🇪',color:0xb78c2c,music:'central-march',stripes:['#111','#d00','#ffce00']},
 russia:{name:'Russia',flag:'🇷🇺',color:0xa04e51,music:'rocket-choir',stripes:['#fff','#0039a6','#d52b1e']},
 japan:{name:'Japan',flag:'🇯🇵',color:0xb14a73,music:'signal-waltz',disc:true}
};
export function country(id){return COUNTRIES[id]||COUNTRIES.italy}
export function flagCanvas(id){const c=document.createElement('canvas');c.width=96;c.height=60;const g=c.getContext('2d'),f=country(id);g.fillStyle='#fff';g.fillRect(0,0,96,60);
 if(f.stripes)f.stripes.forEach((color,i)=>{g.fillStyle=color;g.fillRect(f.vertical?i*32:0,f.vertical?0:i*20,f.vertical?32:96,f.vertical?60:20)});
 if(f.cross){g.fillStyle=f.cross;g.fillRect(26,0,16,60);g.fillRect(0,23,96,14)}
 if(f.disc){g.fillStyle='#bc002d';g.beginPath();g.arc(48,30,18,0,Math.PI*2);g.fill()}
 if(f.union){g.fillStyle='#012169';g.fillRect(0,0,96,60);for(const [color,width] of [['#fff',12],['#c8102e',5]]){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(0,0);g.lineTo(96,60);g.moveTo(96,0);g.lineTo(0,60);g.stroke()}g.fillStyle='#fff';g.fillRect(38,0,20,60);g.fillRect(0,20,96,20);g.fillStyle='#c8102e';g.fillRect(42,0,12,60);g.fillRect(0,24,96,12)}return c}
