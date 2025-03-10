'use client';

import { useEffect } from 'react';
import { ensureChineseDisplay } from '@/lib/utils/decode-unicode';

/**
 * 全局中文文本修复组件
 * 这个组件会在客户端渲染时自动修复页面上的中文 Unicode 编码问题
 */
export default function ChineseTextFix() {
  useEffect(() => {
    // 定义一个递归函数来处理所有文本节点
    function processTextNodes(node: Node) {
      // 如果是文本节点
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        // 检查文本内容是否包含 Unicode 编码的中文
        if (node.textContent.match(/u[0-9a-fA-F]{4}/)) {
          // 解码 Unicode 编码
          node.textContent = ensureChineseDisplay(node.textContent);
        }
      }
      
      // 递归处理所有子节点
      for (let i = 0; i < node.childNodes.length; i++) {
        processTextNodes(node.childNodes[i]);
      }
    }

    // 创建一个 MutationObserver 来监听 DOM 变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // 处理新添加的节点
        mutation.addedNodes.forEach((node) => {
          processTextNodes(node);
        });
      });
    });

    // 首次处理整个文档
    processTextNodes(document.body);

    // 开始观察文档变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 清理函数
    return () => {
      observer.disconnect();
    };
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
