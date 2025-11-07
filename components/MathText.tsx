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
 * MathText 组件 - 使用 MathJax 渲染数学公式
 * 直接在 WebView 中生成完整的 HTML，集成 MathJax CDN
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
  const [webViewHeight, setWebViewHeight] = useState(10);
  const heightReceivedRef = useRef(false);

  // 当 html 内容变化时，重置高度状态
  useEffect(() => {
    setWebViewHeight(10);
    heightReceivedRef.current = false;
  }, [html]);

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

  // 包含数学公式，使用 WebView + MathJax
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const backgroundColor = isDarkMode ? '#1c1c1e' : '#ffffff';

  // 使用本地 MathJax 文件的完整 HTML 文档
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  
  <!-- MathJax 配置 -->
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['\\\\(', '\\\\)'], ['$', '$']],
        displayMath: [['\\\\[', '\\\\]'], ['$$', '$$']],
        processEscapes: true,
        processEnvironments: true
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
      },
      startup: {
        pageReady: function() {
          return MathJax.startup.defaultPageReady().then(function() {
            console.log('MathJax rendering complete');
            sendHeight();
          });
        }
      }
    };
  </script>
  
  <!-- MathJax 库 (本地文件) -->
  <script src="file:///android_asset/jax.js"></script>
  
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
      padding: 2px 4px;
      overflow-x: hidden;
      word-wrap: break-word;
    }
    
    p {
      margin: 0;
      padding: 0;
    }
    
    /* MathJax 渲染的公式样式 */
    .MathJax {
      font-size: 1.05em !important;
    }
    
    .MathJax_Display {
      margin: 12px 0 !important;
      text-align: center;
    }
  </style>
</head>
<body>
  ${html}
  
  <script>
    let lastSentHeight = 0;
    
    // 计算并发送高度
    function sendHeight() {
      const height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );
      
      // 只有高度变化时才发送，避免重复发送相同高度
      if (height !== lastSentHeight && window.ReactNativeWebView) {
        lastSentHeight = height;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'height',
          height: height + 8 // 适当的边距
        }));
      }
    }
    
    // 页面加载完成后发送高度
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(sendHeight, 50);
      });
    } else {
      setTimeout(sendHeight, 50);
    }
    
    // 延迟再次发送，确保 MathJax 渲染完成（减少次数和延迟）
    setTimeout(sendHeight, 300);
    setTimeout(sendHeight, 600);
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
              // 只接受第一次有效的高度更新，避免累积
              if (!heightReceivedRef.current) {
                heightReceivedRef.current = true;
                setWebViewHeight(Math.ceil(data.height));
              } else {
                // 如果新高度比旧高度小，也接受（可能是重新渲染）
                const newHeight = Math.ceil(data.height);
                setWebViewHeight(prev => {
                  // 只有在新高度合理的情况下才更新
                  if (newHeight < prev * 1.2) {
                    return newHeight;
                  }
                  return prev;
                });
              }
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
