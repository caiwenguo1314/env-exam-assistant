/**
 * 处理可能的乱码问题
 * 将Unicode转义序列转换为实际的中文字符
 */
export function decodeUnicodeEscapes(text: string): string {
  if (!text) return '';
  
  // 正则表达式匹配Unicode转义序列，如 u4e2d u6587
  return text.replace(/u([0-9a-fA-F]{4})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

/**
 * 格式化日期时间
 */
export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (error) {
    return dateString;
  }
}
