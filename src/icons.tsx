import React from 'react';
const paths:Record<string,React.ReactNode>={
  upload:<><path d="M12 16V3m-5 5 5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></>,
  save:<><path d="M12 3v12m-4-4 4 4 4-4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></>,
  photo:<><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="1.4"/><path d="m4 17 5-5 4 4 3-3 5 5"/></>,
  video:<><rect x="2" y="5" width="14" height="14" rx="3"/><path d="m16 10 6-4v12l-6-4"/></>,
  crop:<><path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/></>,
  canvas:<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h3m-3 0v3m10 5h-3m3 0v-3"/></>,
  sliders:<><path d="M3 6h6m5 0h7M3 17h11m5 0h2"/><circle cx="11" cy="6" r="2.5"/><circle cx="16" cy="17" r="2.5"/></>,
  grid:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m6-18v18M3 9h18M3 15h18"/></>,
  undo:<path d="M9 5 3 11l6 5m-6-5h11a6 6 0 0 1 6 6"/>,
  redo:<path d="m15 5 6 6-6 5m6-5H10a6 6 0 0 0-6 6"/>,
  reset:<><path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/></>,
  frame:<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>,
  help:<><circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.9 2.9 0 1 1 4.3 2.5c-1.3.8-1.5 1.1-1.5 2.5m0 3h.01"/></>,
  lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2"/></>,
  check:<path d="m5 12 4 4L19 6"/>,close:<path d="m6 6 12 12M18 6 6 18"/>,
  minus:<path d="M5 12h14"/>,plus:<path d="M5 12h14m-7-7v14"/>,
  zoom:<><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,
  link:<><path d="m10 13 4-4m-5 1-2 2a3 3 0 0 0 4 4l2-2m2-1 2-2a3 3 0 0 0-4-4l-2 2"/></>,
  play:<path d="m7 4 13 8-13 8z"/>,pause:<><path d="M8 4v16m8-16v16"/></>,
  move:<><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/></>,
  chevron:<path d="m7 10 5 5 5-5"/>,file:<><path d="M5 3h9l5 5v13H5zM14 3v6h5"/></>
};
export function Icon({name,size=18}:{name:string,size?:number}){
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
