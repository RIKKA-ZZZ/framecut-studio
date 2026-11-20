/* The encoder and all media processing run in this dedicated worker. */
importScripts("./engine/ffmpeg-core.js");
self.onmessage = async ({data}) => {
  const status = (label, percent) => self.postMessage({label, percent});
  try {
    status("正在载入视频引擎", 0);
    const chunks = await Promise.all([0,1,2,3].map(async i => {
      const response = await fetch("./engine/core-" + i + ".bin");
      if (!response.ok) throw Error("视频引擎加载失败，请刷新后重试。");
      return response.arrayBuffer();
    }));
    const wasmBinary = await new Blob(chunks).arrayBuffer();
    const core = await createFFmpegCore({wasmBinary});
    core.setProgress(({progress}) => status("正在编码视频", Math.max(0, Math.min(99, Math.round(progress * 100)))));
    let lastError = "";
    core.setLogger(({message}) => {
      if (/error|invalid|not found|failed|out of memory/i.test(message)) lastError = message;
    });
    status("正在读取素材", 0);
    core.FS.writeFile("input", new Uint8Array(await data.file.arrayBuffer()));
    const {left,top,width,height,outW,outH,color,srcW,srcH} = data;
    const padX = Math.max(0,-left), padY = Math.max(0,-top);
    const padW = Math.max(srcW + padX,left + padX + width);
    const padH = Math.max(srcH + padY,top + padY + height);
    const filters = [
      "scale=" + srcW + ":" + srcH, "setsar=1", "format=yuv444p",
      "pad=" + padW + ":" + padH + ":" + padX + ":" + padY + ":0x" + color.slice(1),
      "crop=" + width + ":" + height + ":" + (left + padX) + ":" + (top + padY),
      "scale=" + outW + ":" + outH + ":flags=lanczos", "setsar=1","format=yuv420p"
    ].join(",");
    status("正在编码视频", 0);
    const result = core.exec("-i","input","-map","0:v:0","-map","0:a:0?","-vf",filters,
      "-c:v","libx264","-preset","ultrafast","-crf","21","-threads","1",
      "-c:a","aac","-b:a","160k","-movflags","+faststart","-map_metadata","-1","output.mp4");
    if (result !== 0) throw Error(lastError || "视频编码失败，请减小输出尺寸后重试。");
    const bytes = core.FS.readFile("output.mp4");
    self.postMessage({bytes:bytes.buffer}, [bytes.buffer]);
  } catch (error) {
    self.postMessage({error: (error && error.message) || "此视频无法导出。"});
  }
};
