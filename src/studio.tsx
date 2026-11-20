import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Config,Mode,Rect,align,centered,clamp,initial,magnify,presets,resize} from './geometry';
import {Icon} from './icons';

type Media={url:string;name:string;w:number;h:number;video:boolean;demo:boolean;file?:File;duration?:number};
const sample:Media={url:'./alpine-lake.jpg',name:'高山湖畔.jpg',w:1600,h:900,video:false,demo:true};
const handles=['nw','n','ne','e','se','s','sw','w'];
const formatTime=(s:number)=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const integer=(n:number)=>Math.max(1,Math.round(n));
const pixels=(n:number,video:boolean)=>video?Math.max(2,Math.round(n/2)*2):integer(n);
const normal=(c:Config,video:boolean):Config=>({...c,outW:pixels(c.outW,video),outH:pixels(c.outH,video)});
function IconButton({label,name,onClick,disabled,active}:{label:string;name:string;onClick:()=>void;disabled?:boolean;active?:boolean}){
  return <button type="button" className={'icon-btn'+(active?' active':'')} onClick={onClick} title={label} aria-label={label} disabled={disabled}><Icon name={name}/></button>;
}
function NumberField({label,value,onChange}:{label:string;value:number;onChange:(n:number)=>void}){
  const [draft,setDraft]=useState(String(value));
  useEffect(()=>setDraft(String(value)),[value]);
  return <label className="num"><span>{label}</span><input type="number" min="1" max="16384" value={draft} onChange={e=>setDraft(e.target.value)}
    onBlur={()=>{const n=Number(draft);if(n>0 && Number.isFinite(n))onChange(clamp(Math.round(n),1,16384));setDraft(String(value));}}
    onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}} aria-label={'输出'+label}/></label>;
}
function App(){
  const [media,setMedia]=useState<Media>(sample),[c,setC]=useState<Config>(()=>initial(sample.w,sample.h,true));
  const state=useRef(c);state.current=c;
  const back=useRef<Config[]>([]),forward=useRef<Config[]>([]);
  const [grid,setGrid]=useState(true),[wide,setWide]=useState(false),[dragOver,setDragOver]=useState(false);
  const [help,setHelp]=useState(false),[time,setTime]=useState(0),[playing,setPlaying]=useState(false);
  const [msg,setMsg]=useState(''),[loading,setLoading]=useState(false),[busy,setBusy]=useState<{label:string;percent:number}|null>(null);
  const fileInput=useRef<HTMLInputElement>(null),stage=useRef<HTMLDivElement>(null),photo=useRef<HTMLImageElement>(null),movie=useRef<HTMLVideoElement>(null);
  const worker=useRef<Worker|null>(null),loadId=useRef(0),exportId=useRef(0),helpBtn=useRef<HTMLButtonElement>(null),helpModal=useRef<HTMLDialogElement>(null);
  const [size,setSize]=useState({w:800,h:470});
  const gesture=useRef<{id:number;startX:number;startY:number;cfg:Config;scale:number;part:string;moved:boolean}|null>(null);
  const flashTimer=useRef(0);
  const flash=(text:string)=>{setMsg(text);clearTimeout(flashTimer.current);flashTimer.current=window.setTimeout(()=>setMsg(''),6500);};
  const update=(newCfg:Config)=>{state.current=newCfg;setC(newCfg);};
  const record=(old:Config)=>{back.current=[...back.current.slice(-49),old];forward.current=[];};
  const change=(cfg:Config)=>{record(state.current);update(normal(cfg,media.video));};
  const undo=()=>{if(back.current.length){forward.current.push(state.current);update(back.current.pop()!);}};
  const redo=()=>{if(forward.current.length){back.current.push(state.current);update(forward.current.pop()!);}};
  const zoomTo=(value:number)=>change(magnify(state.current,value,media.w,media.h));
  useLayoutEffect(()=>{const el=stage.current!;const obs=new ResizeObserver(()=>setSize({w:el.clientWidth,h:el.clientHeight}));obs.observe(el);return()=>obs.disconnect();},[]);
  useEffect(()=>()=>{if(media.file)URL.revokeObjectURL(media.url);},[media]);
  useEffect(()=>{if(help)helpModal.current?.showModal();else if(helpModal.current?.open)helpModal.current.close();},[help]);
  useEffect(()=>()=>{worker.current?.terminate();clearTimeout(flashTimer.current);},[]);
  const openFile=async(file?:File)=>{
    if(!file||busy)return;
    const id=++loadId.current;setLoading(true);
    const video=file.type.startsWith('video/')||/\.(mp4|mov|webm|m4v|mkv|avi)$/i.test(file.name);
    const url=URL.createObjectURL(file);let retained=false;
    try{
      let w:number,h:number,duration:number|undefined;
      if(video){
        const probe=document.createElement('video');probe.preload='metadata';
        try{await new Promise<void>((resolve,reject)=>{probe.onloadedmetadata=()=>resolve();probe.onerror=()=>reject(Error('浏览器无法预览此视频编码。请尝试 H.264 MP4 或 WebM。'));probe.src=url;});
          w=probe.videoWidth;h=probe.videoHeight;duration=probe.duration;
          if(!Number.isFinite(duration)||!duration)throw Error('无法读取视频时长。');
        }finally{probe.removeAttribute('src');probe.load();}
      }else{const probe=new Image();probe.src=url;await probe.decode();w=probe.naturalWidth;h=probe.naturalHeight;}
      if(id!==loadId.current)return;
      if(!w||!h)throw Error('无法读取素材尺寸。');
      retained=true;back.current=[];forward.current=[];setTime(0);setPlaying(false);
      setMedia({url,w,h,name:file.name,file,demo:false,video,duration});update(normal(initial(w,h),video));
      setMsg('');
    }catch(e){if(id===loadId.current)flash(e instanceof Error&&e.name==='Error'?e.message:'无法打开这个文件，请选择图片或浏览器可播放的视频。');}
    finally{if(!retained)URL.revokeObjectURL(url);if(id===loadId.current)setLoading(false);}
  };
  function choose(key:string,mode:Mode=c.mode){
    const custom=key==='custom',ratio=presets.find(p=>p.key===key)?.ratio|| (custom?c.outW/c.outH:media.w/media.h);
    const box=centered(media.w,media.h,ratio);
    let ow=box.w,oh=box.h;
    if(mode==='canvas'){if(custom){ow=c.outW;oh=c.outH;}else{ow=ratio>=1?1920:1080;oh=ow/ratio;if(key==='1:1'){ow=oh=1080;}}}
    change({...c,mode,box,ratio:key,zoom:1,outW:ow,outH:oh});
  }
  function dimension(axis:'w'|'h',v:number){
    const aspect=c.box.w/c.box.h;
    let ow=axis==='w'?v:c.outW,oh=axis==='h'?v:c.outH;
    if(c.mode==='canvas'){
      const ratio=ow/oh;
      if(ratio>100||ratio<.01){flash('请使用 1:100 至 100:1 之间的画布比例。');return;}
      const b=centered(media.w,media.h,ratio);
      change({...c,outW:ow,outH:oh,box:b,zoom:1,ratio:'custom'});
    }else{
      if(axis==='w')oh=v/aspect;else ow=v*aspect;
      const scale=Math.min(1,16384/Math.max(ow,oh));
      change({...c,outW:ow*scale,outH:oh*scale});
    }
  }
  const {box:b}=c, fixed=c.mode==='canvas';
  const margin=size.w<620?22:38;
  const scale=Math.min((size.w-2*margin)/(fixed?b.w:media.w),(size.h-2*margin)/(fixed?b.h:media.h));
  const originX=(size.w-(fixed?b.w:media.w)*scale)/2-(fixed?b.x*scale:0);
  const originY=(size.h-(fixed?b.h:media.h)*scale)/2-(fixed?b.y*scale:0);
  const screen={left:b.x*scale+originX,top:b.y*scale+originY,width:b.w*scale,height:b.h*scale};
  const mediaStyle={left:originX,top:originY,width:media.w*scale,height:media.h*scale};
  const preservesAlpha=!media.video && c.format!=='jpeg' && (!fixed||c.transparent&&c.format==='png');
  const bg=preservesAlpha?'':c.color;
  function down(e:React.PointerEvent,part:string){
    if(busy||e.button!==0)return;
    e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current={id:e.pointerId,cfg:c,scale,startX:e.clientX,startY:e.clientY,part,moved:false};
  }
  function move(e:React.PointerEvent){
    const g=gesture.current;if(!g||g.id!==e.pointerId)return;
    const dx=(e.clientX-g.startX)/g.scale,dy=(e.clientY-g.startY)/g.scale;
    if(!g.moved&&Math.abs(dx)+Math.abs(dy)<.5)return;
    if(!g.moved){record(g.cfg);g.moved=true;}
    const old=g.cfg,canvas=old.mode==='canvas',bb=old.box;
    if(g.part==='move'){
      update({...old,box:align({...bb,x:bb.x+(canvas?-dx:dx),y:bb.y+(canvas?-dy:dy)},media.w,media.h,canvas)});
    }else{
      const box=resize(bb,g.part,dx,dy,media.w,media.h,presets.find(p=>p.key===old.ratio)?.ratio||0);
      update(normal({...old,box,zoom:1,outW:box.w,outH:box.h},media.video));
    }
  }
  const wheelSnapshot=useRef(0);
  useEffect(()=>{
    const el=stage.current!;
    const wheel=(e:WheelEvent)=>{e.preventDefault();if(busy)return;
      if(Date.now()-wheelSnapshot.current>350)record(state.current);
      wheelSnapshot.current=Date.now();const current=state.current;
      update(magnify(current,current.zoom*Math.exp(-e.deltaY*.0018),media.w,media.h));
    };
    el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
  },[media,busy]);
  const togglePlay=()=>{if(!movie.current)return;if(movie.current.paused)movie.current.play().catch(()=>flash('此视频暂时无法播放。'));else movie.current.pause();};
  useEffect(()=>{const key=(e:KeyboardEvent)=>{
    if(help||busy||loading||e.ctrlKey&&e.altKey||/INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement).tagName))return;
    const k=e.key.toLowerCase();
    if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();}
    else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();redo();}
    else if(e.ctrlKey||e.metaKey||e.altKey)return;
    else if(k==='g'){setGrid(v=>!v);}else if(k==='escape'){setWide(false);}
    else if(k===' '&&media.video&&(e.target as HTMLElement).tagName!=='BUTTON'){e.preventDefault();togglePlay();}
    else if(['arrowleft','arrowright','arrowup','arrowdown'].includes(k)){e.preventDefault();const d=(e.shiftKey?10:1)*(fixed?-1:1);
      change({...c,box:align({...b,x:b.x+(k==='arrowright'?d:k==='arrowleft'?-d:0),y:b.y+(k==='arrowdown'?d:k==='arrowup'?-d:0)},media.w,media.h,fixed)});
    }
  };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
  function download(blob:Blob,extension:string){
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=media.name.replace(/\.[^.]+$/,'')+'-裁切.'+extension;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    flash('文件已导出 · '+c.outW+' × '+c.outH+' px');
  }
  function stop(){exportId.current++;worker.current?.terminate();worker.current=null;setBusy(null);}
  async function output(){
    if(busy||loading)return;movie.current?.pause();
    if(c.outW*c.outH>(media.video?16777216:67108864)){flash('输出像素数过大，请调小宽度或高度。');return;}
    const token=++exportId.current;setBusy({label:'正在生成文件',percent:0});
    try{
      if(!media.video){
        const img=photo.current!;await img.decode();
        const canvas=document.createElement('canvas');canvas.width=c.outW;canvas.height=c.outH;
        const ctx=canvas.getContext('2d');if(!ctx)throw Error('浏览器无法创建画布。');
        if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);}
        ctx.imageSmoothingQuality='high';
        ctx.drawImage(img,-b.x/b.w*c.outW,-b.y/b.h*c.outH,media.w/b.w*c.outW,media.h/b.h*c.outH);
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('生成图片失败。')),'image/'+c.format,.94));
        if(token===exportId.current){download(blob,blob.type==='image/jpeg'?'jpg':blob.type.split('/')[1]);setBusy(null);}
      }else{
        const job=new Worker('./video-worker.js');worker.current=job;
        job.onmessage=({data})=>{if(token!==exportId.current)return;
          if(data.bytes){download(new Blob([data.bytes],{type:'video/mp4'}),'mp4');stop();}
          else if(data.error){stop();flash('导出失败 · '+data.error);}
          else setBusy({label:data.label,percent:data.percent});
        };job.onerror=()=>{stop();flash('视频编码器未能运行，请刷新页面或调小输出尺寸。');};
        job.postMessage({file:media.file,left:Math.round(b.x),top:Math.round(b.y),width:integer(b.w),height:integer(b.h),
          outW:c.outW,outH:c.outH,color:c.color,srcW:media.w,srcH:media.h});
      }
    }catch(e){if(token===exportId.current){stop();flash(e instanceof Error?e.message:'导出失败，请重试。');}}
  }
  const ratioChoices=presets.map(p=>fixed&&p.key==='free'?{...p,label:'自定义',key:'custom'}:p);
  const pct=Math.round(c.zoom*100),isBusy=!!busy||loading;
  const minZoom=fixed?.25:Math.max(.25,b.w*c.zoom/media.w,b.h*c.zoom/media.h);
  const zoomSlider=100*Math.log(c.zoom/minZoom)/Math.log(8/minZoom);
  return <div className="app" onDragOver={e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();setDragOver(true);}}}
    onDrop={e=>{e.preventDefault();setDragOver(false);openFile(e.dataTransfer.files[0]);}}>
    <header className="header"><div className="header-in"><div className="brand"><img src="./mark.svg" alt=""/><span>Framecut</span><i/><span className="brand-cn">取景</span></div>
      <div className="head-right"><span className="local"><span className="green"/>本地处理</span><i/><button ref={helpBtn} className="text-button" onClick={()=>setHelp(true)}><Icon name="help"/>使用帮助</button></div></div></header>
    <main><div className="page-title"><div><div className="eyebrow"><span/> IMAGE / VIDEO</div><h1>裁切工作台</h1></div>
      <button className="import" disabled={isBusy} onClick={()=>fileInput.current?.click()}><Icon name="upload"/>导入素材</button>
      <input type="file" accept="image/*,video/*,.mkv,.mov" ref={fileInput} hidden onChange={e=>{openFile(e.target.files?.[0]);e.target.value='';}}/></div>
    <div className="layout"><section className={'workspace'+(wide?' wide':'')} aria-label="裁切预览">
      <div className="media-bar"><div className="file-icon"><Icon name={media.video?'video':'photo'} size={20}/></div>
        <div className="file-desc"><strong>{media.name}</strong><span>{media.demo?'示例图片':media.video?'视频':'图片'}<em>·</em>{media.w} × {media.h} px</span></div>
        <div className="history"><IconButton name="undo" label="撤销" onClick={undo} disabled={!back.current.length||isBusy}/><IconButton name="redo" label="重做" onClick={redo} disabled={!forward.current.length||isBusy}/></div></div>
      <div className="stage" ref={stage} aria-label="可拖动裁切区域" onPointerMove={move} onPointerUp={()=>gesture.current=null} onPointerCancel={()=>gesture.current=null}>
        <div className="stage-tag"><span/> {media.video?'视频预览':'图片预览'}</div>
        <div className="underlay" style={{...(fixed?screen:mediaStyle),backgroundColor:bg||undefined}}/>
        {media.video?<video key={media.url} ref={movie} className="source" style={mediaStyle} src={media.url} playsInline preload="auto"
          onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)}/>:
          <img ref={photo} className="source" src={media.url} style={mediaStyle} draggable={false} alt="待裁切的图片"/>}
        <div className={'selection '+(grid?'show-grid ':'')+(fixed?'fixed':'')} style={screen} onPointerDown={e=>down(e,'move')}>
          <div className="guides"/><div className="thirds"/>
          {(!fixed?handles:['nw','ne','se','sw']).map(h=><span aria-hidden="true" key={h} className={'handle '+h}
            onPointerDown={fixed?undefined:e=>{e.stopPropagation();down(e,h);}}/>)}
          <span className="size-tag">{integer(b.w)} × {integer(b.h)}</span>
        </div>
      </div>
      {media.video&&<div className="playbar"><IconButton name={playing?'pause':'play'} label={playing?'暂停':'播放'} onClick={togglePlay} disabled={isBusy}/>
        <span>{formatTime(time)}</span><input aria-label="视频进度" type="range" min="0" max={media.duration} step=".01" value={time} onChange={e=>{if(movie.current)movie.current.currentTime=Number(e.target.value);setTime(Number(e.target.value));}}/>
        <span>{formatTime(media.duration||0)}</span></div>}
      <div className="stage-tools"><span className="gesture-hint"><Icon name="move" size={16}/>{fixed?'拖动画面调整位置':'拖动选区或边角调整范围'}</span><div className="view-buttons">
        <IconButton name="grid" label={grid?'隐藏参考线':'显示参考线'} active={grid} onClick={()=>setGrid(v=>!v)}/>
        <IconButton name="frame" label={wide?'收起预览':'展开预览'} active={wide} onClick={()=>setWide(v=>!v)}/></div></div>
    </section>
    <aside className="settings"><div className="settings-title"><span className="warm-icon"><Icon name="sliders" size={19}/></span><h2>裁切设置</h2>
      <button className="reset" disabled={isBusy} onClick={()=>change(initial(media.w,media.h,media.demo))} title="重置全部设置"><Icon name="reset" size={14}/>重置</button></div>
      <fieldset disabled={isBusy}><div className="section"><h3>编辑模式</h3><div className="modes">{(['free','canvas'] as Mode[]).map(mode=><button key={mode} className={c.mode===mode?'picked':''} aria-pressed={c.mode===mode} onClick={()=>{if(c.mode!==mode)choose(mode==='canvas'?'1:1':'free',mode);}}><Icon name={mode==='free'?'crop':'canvas'} size={16}/>{mode==='free'?'自由裁切':'固定画布'}</button>)}</div></div>
      <div className="section"><h3>{fixed?'画布比例':'裁切比例'}</h3><div className="ratios">{ratioChoices.map(p=><button key={p.key} aria-pressed={c.ratio===p.key} className={c.ratio===p.key?'selected':''} onClick={()=>choose(p.key)}>
        <span className={'ratio-icon '+(!p.ratio?'dashed':'')} style={{width:p.ratio>=1?22:p.ratio?17*p.ratio:21,height:p.ratio>=1?22/p.ratio:p.ratio?17:16}}/>{p.label}</button>)}</div></div>
      <div className="section zoom-section"><h3>素材缩放<span className="value">{pct}%</span></h3><div className="zoom-row"><IconButton name="minus" label="缩小素材" onClick={()=>zoomTo(c.zoom/1.1)}/>
        <input aria-label="素材缩放" type="range" min="0" max="100" step=".1"
          value={zoomSlider} aria-valuetext={pct+'%'} style={{'--fill':zoomSlider+'%'} as React.CSSProperties}
          onPointerDown={()=>record(c)} onKeyDown={e=>{if(e.key.startsWith('Arrow'))record(c);}}
          onChange={e=>update(magnify(state.current,minZoom*(8/minZoom)**(Number(e.target.value)/100),media.w,media.h))}/>
        <IconButton name="plus" label="放大素材" onClick={()=>zoomTo(c.zoom*1.1)}/></div></div>
      <div className="export-options"><h3>输出尺寸<span className="unit">PX</span></h3><div className="dimensions">
        <NumberField label="宽" value={c.outW} onChange={v=>{if(v!==c.outW)dimension('w',v);}}/><span className="times">×</span><NumberField label="高" value={c.outH} onChange={v=>{if(v!==c.outH)dimension('h',v);}}/></div>
        {fixed&&<div className="background-row"><label>背景色<input type="color" value={c.color} onChange={e=>change({...c,color:e.target.value,transparent:false})}/></label>
          {!media.video&&c.format==='png'&&<label><input type="checkbox" checked={c.transparent} onChange={e=>change({...c,transparent:e.target.checked})}/>透明</label>}</div>}
        <div className="format-row"><label htmlFor="format">导出格式</label>{media.video?<strong>MP4 <small>H.264</small></strong>:<div className="select-wrap"><select id="format" value={c.format} onChange={e=>change({...c,format:e.target.value as Config['format']})}><option value="png">PNG</option><option value="jpeg">JPG</option><option value="webp">WebP</option></select><Icon name="chevron" size={15}/></div>}</div>
      </div></fieldset>
      <div className="export-foot">{busy?<div className="progress"><div>{busy.label} <b>{busy.percent}%</b></div><progress max="100" value={busy.percent}/><button onClick={()=>{stop();flash('已取消导出');}}>取消导出</button></div>:
        <button className="export" onClick={output} disabled={loading}><Icon name="save"/>{loading?'正在读取素材…':media.video?'导出视频':'导出图片'}</button>}</div>
    </aside></div><footer><span><Icon name="lock" size={14}/>素材仅在当前设备处理</span><span>Framecut Studio</span></footer></main>
    {dragOver&&<div className="drop" onDragLeave={()=>setDragOver(false)}><Icon name="upload" size={40}/><strong>松开以导入素材</strong></div>}
    {msg&&<div className="toast" role="status">{msg}<button aria-label="关闭提示" onClick={()=>setMsg('')}><Icon name="close" size={16}/></button></div>}
    <dialog ref={helpModal} onCancel={()=>setHelp(false)} onClose={()=>{setHelp(false);helpBtn.current?.focus();}} onClick={e=>{if(e.target===e.currentTarget)setHelp(false);}}>
      <div className="help-title"><h2>使用帮助</h2><IconButton name="close" label="关闭帮助" onClick={()=>setHelp(false)}/></div>
      <p>导入一张图片或一段视频，也可以直接把文件拖到工作台。</p>
      <h3>自由裁切</h3><p>拖动边角改变选区。拖动框内可移动选区，输出宽高会按选区比例联动。</p>
      <h3>固定画布</h3><p>选择比例或输入输出宽高。滚轮缩放素材，拖动调整位置。视频使用相同构图导出整段并保留原声。</p>
      <div className="shortcuts"><span>微调位置</span><kbd>方向键</kbd><span>移动 10 像素</span><kbd>Shift + 方向键</kbd><span>切换参考线</span><kbd>G</kbd><span>撤销</span><kbd>Ctrl / ⌘ + Z</kbd></div>
    </dialog>
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
