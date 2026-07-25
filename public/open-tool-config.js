const TOOLS = Object.freeze({
  'image-processor': Object.freeze({
    name: 'FiFi 图片处理工具',
    href: 'https://olafifi.github.io/ui-image-processor/'
  }),
  'rich-text': Object.freeze({
    name: 'FiFi 富文本转换',
    href: 'https://olafifi.github.io/rich-text-translator/'
  })
});

export function resolveTool(id) {
  return typeof id === 'string' && Object.hasOwn(TOOLS, id) ? TOOLS[id] : null;
}
