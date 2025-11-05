import React, { useState, useRef, useEffect } from 'react';
import { View, useColorScheme, StyleSheet, Platform } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { WebView } from 'react-native-webview';

interface MathTextProps {
  html: string;
  contentWidth: number;
  fontSize?: number;
  lineHeight?: number;
  fontWeight?: string;
}

/**
 * 检测 HTML 内容是否包含数学公式
 * 支持格式: \(...\), \[...\], $...$, $$...$$
 */
function hasMathFormula(html: string): boolean {
  const mathPatterns = [
    /\\\([\s\S]*?\\\)/,  // \(...\)
    /\\\[[\s\S]*?\\\]/,  // \[...\]
    /\$[\s\S]*?\$/,      // $...$
    /\$\$[\s\S]*?\$\$/   // $$...$$
  ];
  
  return mathPatterns.some(pattern => pattern.test(html));
}

/**
 * MathText 组件 - 完全离线版本
 * 直接在 WebView 中生成完整的 HTML
 */
export default function MathText({
  html,
  contentWidth,
  fontSize = 18,
  lineHeight = 25,
  fontWeight = 'normal',
}: MathTextProps) {
  const isDarkMode = useColorScheme() === 'dark';
  const containsMath = hasMathFormula(html);
  const [webViewHeight, setWebViewHeight] = useState(20);

  // 如果不包含数学公式，使用普通的 RenderHTML
  if (!containsMath) {
    const tagsStyles = {
      body: {
        color: isDarkMode ? '#fff' : '#000',
        fontSize,
        lineHeight,
        fontWeight: fontWeight as any,
      },
      p: {
        margin: 0,
        padding: 0,
      },
    };

    return (
      <RenderHTML
        contentWidth={contentWidth}
        source={{ html }}
        tagsStyles={tagsStyles}
      />
    );
  }

  // 包含数学公式，使用 WebView
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const backgroundColor = isDarkMode ? '#1c1c1e' : '#ffffff';

  // 处理数学公式的函数
  const processedHtml = html
    // 先处理双美元符（块级公式），避免被单美元符匹配
    .replace(/\$\$(.+?)\$\$/g, '<div class="math-block">$1</div>')
    // 处理 \[ ... \] 块级公式
    .replace(/\\\[(.+?)\\\]/g, '<div class="math-block">$1</div>')
    // 处理单美元符（行内公式）
    .replace(/\$(.+?)\$/g, '<span class="math-inline">$1</span>')
    // 处理 \( ... \) 行内公式
    .replace(/\\\((.+?)\\\)/g, '<span class="math-inline">$1</span>');

  // 完整的 HTML 文档
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: ${textColor};
      background-color: ${backgroundColor};
      font-size: ${fontSize}px;
      line-height: ${lineHeight}px;
      font-weight: ${fontWeight};
      padding: 4px 6px;
      overflow-x: hidden;
      word-wrap: break-word;
    }
    
    p {
      margin: 0;
      padding: 0;
    }
    
    /* 行内数学公式样式 */
    .math-inline {
      display: inline;
      font-style: italic;
      color: #0066cc;
      margin: 0 2px;
      font-family: 'Times New Roman', serif;
    }
    
    /* 块级数学公式样式 */
    .math-block {
      display: block;
      text-align: center;
      font-style: italic;
      color: #0066cc;
      margin: 12px 0;
      padding: 8px 0;
      font-family: 'Times New Roman', serif;
      font-size: ${fontSize + 2}px;
    }
  </style>
</head>
<body>
  ${processedHtml}
  
  <script>
    // 计算并发送高度
    function sendHeight() {
      const height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );
      
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'height',
          height: height + 10 // 额外的边距
        }));
      }
    }
    
    // 页面加载完成后发送高度
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', sendHeight);
    } else {
      sendHeight();
    }
    
    // 延迟再次发送，确保渲染完成
    setTimeout(sendHeight, 100);
    setTimeout(sendHeight, 300);
  </script>
</body>
</html>
  `.trim();

  return (
    <View style={styles.mathContainer}>
      <WebView
        source={{ html: fullHtml, baseUrl: 'about:blank' }}
        style={{ width: contentWidth, height: webViewHeight, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled={true}
        domStorageEnabled={false}
        androidLayerType="hardware"
        originWhitelist={['*']}
        scalesPageToFit={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'height' && data.height) {
              setWebViewHeight(Math.ceil(data.height));
            }
          } catch (e) {
            console.warn('[MathText] Failed to parse message:', e);
          }
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[MathText] WebView Error:', nativeEvent);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mathContainer: {
    marginVertical: 0,
  },
});
