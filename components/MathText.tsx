import React, { useState } from 'react';
import { View, useColorScheme, StyleSheet } from 'react-native';
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
 * MathText 组件
 * 自动检测内容，如果包含数学公式则使用 MathJax WebView 渲染，否则使用普通 RenderHTML
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
        fontWeight,
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

  // 包含数学公式，使用 WebView + MathJax 渲染
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const backgroundColor = isDarkMode ? '#1c1c1e' : '#ffffff';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script type="text/javascript" async
    src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML">
  </script>
  <script type="text/x-mathjax-config">
    MathJax.Hub.Config({
      tex2jax: {
        inlineMath: [['\\\\(', '\\\\)'], ['$', '$']],
        displayMath: [['\\\\[', '\\\\]'], ['$$', '$$']],
        processEscapes: true
      },
      "HTML-CSS": {
        scale: 100,
        linebreaks: { automatic: true },
        availableFonts: ["STIX", "TeX"]
      },
      showMathMenu: false,
      messageStyle: "none"
    });
    
    // 渲染完成后通知 React Native 调整高度
    MathJax.Hub.Queue(function() {
      setTimeout(function() {
        var height = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight
        );
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'height',
          height: height
        }));
      }, 100);
    });
  </script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${fontSize}px;
      line-height: ${lineHeight}px;
      color: ${textColor};
      background-color: ${backgroundColor};
      padding: 2px 4px;
      margin: 0;
      overflow-x: hidden;
      word-wrap: break-word;
      font-weight: ${fontWeight};
    }
    p {
      margin: 0;
      padding: 0;
    }
    .mjx-chtml {
      font-size: 1em !important;
      display: inline !important;
    }
    .MJXc-display {
      margin: 0 !important;
      display: inline !important;
    }
    mjx-container {
      display: inline !important;
      margin: 0 !important;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
  `.trim();

  return (
    <View style={styles.mathContainer}>
      <WebView
        source={{ html: htmlContent }}
        style={{ width: contentWidth, height: webViewHeight }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled={true}
        androidLayerType="hardware"
        originWhitelist={['*']}
        scalesPageToFit={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'height' && data.height) {
              // 动态调整 WebView 高度，减少额外的内边距
              setWebViewHeight(data.height);
            }
          } catch (e) {
            // 忽略解析错误
          }
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

