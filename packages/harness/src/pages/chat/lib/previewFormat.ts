type Type = 'image' | 'audio' | 'video' | 'office' | 'pdf' | 'table' | 'markdown';
const formats = new Map<string, { type: Type; mime?: string }>();
function register(type: Type, extensions: string, mime?: string) {
  for (const ext of extensions.split(' ')) formats.set(ext, { type, mime });
}
register('office', 'docx docm xlsx xlsm pptx pptm odt ods odp zip');
register('pdf', 'pdf');
register('markdown', 'md markdown mdown');
register('table', 'csv tsv');
register('image', 'png', 'image/png');
register('image', 'jpg jpeg jfif', 'image/jpeg');
for (const ext of ['gif', 'webp', 'bmp', 'avif']) register('image', ext, 'image/' + ext);
register('image', 'ico', 'image/x-icon');
register('image', 'svg', 'image/svg+xml');
register('audio', 'wav', 'audio/wav');
register('audio', 'mp3', 'audio/mpeg');
register('audio', 'ogg oga opus', 'audio/ogg');
register('audio', 'weba', 'audio/webm');
register('audio', 'm4a', 'audio/mp4');
register('audio', 'flac', 'audio/flac');
register('audio', 'aac', 'audio/aac');
register('video', 'mp4 m4v', 'video/mp4');
register('video', 'webm', 'video/webm');
register('video', 'ogv', 'video/ogg');
register('video', 'mov', 'video/quicktime');
register('video', 'mkv', 'video/x-matroska');
register('video', 'avi', 'video/x-msvideo');
export function previewFormat(path: string) {
  const extension = /\.([^./\\]+)$/.exec(path)?.[1];
  return extension ? formats.get(extension.toLowerCase()) : undefined;
}
