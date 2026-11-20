export type Rect = {x:number; y:number; w:number; h:number};
export type Mode = 'free' | 'canvas';
export type Config = {
  mode:Mode; ratio:string; box:Rect; zoom:number; outW:number; outH:number;
  color:string; transparent:boolean; format:'png' | 'jpeg' | 'webp';
};
export const clamp = (n:number,a:number,b:number) => Math.max(a,Math.min(b,n));
export const presets = [
  {key:'free',label:'自由',ratio:0},{key:'1:1',label:'1:1',ratio:1},
  {key:'4:5',label:'4:5',ratio:4/5},{key:'9:16',label:'9:16',ratio:9/16},
  {key:'16:9',label:'16:9',ratio:16/9},{key:'4:3',label:'4:3',ratio:4/3}
];
export function centered(w:number,h:number,ratio:number,fraction=1):Rect {
  const bw=Math.min(w,h*ratio)*fraction, bh=bw/ratio;
  return {x:(w-bw)/2,y:(h-bh)/2,w:bw,h:bh};
}
export function initial(w:number,h:number,demo=false):Config {
  const box=demo?centered(w,h,16/10,.78):{x:0,y:0,w,h};
  return {mode:'free',ratio:'free',box,zoom:1,outW:Math.round(box.w),outH:Math.round(box.h),
    format:'png',color:'#ffffff',transparent:false};
}
export function align(box:Rect,w:number,h:number,pad:boolean):Rect {
  const {x,y,w:bw,h:bh}=box;
  return {...box,x:clamp(x,pad?-bw+Math.min(bw,w)*.1:0,pad?w-Math.min(bw,w)*.1:Math.max(0,w-bw)),
    y:clamp(y,pad?-bh+Math.min(bh,h)*.1:0,pad?h-Math.min(bh,h)*.1:Math.max(0,h-bh))};
}
export function magnify(c:Config,next:number,w:number,h:number):Config {
  const b=c.box, baseW=b.w*c.zoom,baseH=b.h*c.zoom;
  const min=c.mode==='canvas'?.25:Math.max(.25,baseW/w,baseH/h);
  const zoom=clamp(next,min,Math.min(8,Math.max(min,Math.min(baseW,baseH)/2)));
  const nw=baseW/zoom,nh=baseH/zoom;
  const box=align({x:b.x+(b.w-nw)/2,y:b.y+(b.h-nh)/2,w:nw,h:nh},w,h,c.mode==='canvas');
  return {...c,zoom,box};
}
export function resize(b:Rect,handle:string,dx:number,dy:number,w:number,h:number,ratio:number):Rect {
  const left=handle.includes('w'),right=handle.includes('e'),top=handle.includes('n'),bottom=handle.includes('s');
  const fx=left?b.x+b.w:right?b.x:b.x+b.w/2,fy=top?b.y+b.h:bottom?b.y:b.y+b.h/2;
  const maxW=left?fx:right?w-fx:2*Math.min(fx,w-fx),maxH=top?fy:bottom?h-fy:2*Math.min(fy,h-fy);
  const min=Math.min(12,w,h);
  let nw=clamp(b.w+(left?-dx:right?dx:0),Math.min(min,maxW),maxW);
  let nh=clamp(b.h+(top?-dy:bottom?dy:0),Math.min(min,maxH),maxH);
  if(ratio){
    if(!(left||right)||((top||bottom)&&Math.abs(dy)*ratio>Math.abs(dx))) nw=nh*ratio;
    nw=clamp(nw,Math.min(min,maxW,maxH*ratio),Math.min(maxW,maxH*ratio));nh=nw/ratio;
  }
  return {x:left?fx-nw:right?fx:fx-nw/2,y:top?fy-nh:bottom?fy:fy-nh/2,w:nw,h:nh};
}
