import katex from 'katex';
import 'katex/dist/katex.min.css';

export const renderLatex = (text: string): string => {
  if (!text) return '';
  try {
    let html = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      try {
        return katex.renderToString(math, { displayMode: true, throwOnError: false });
      } catch (e) {
        return match;
      }
    });

    html = html.replace(/\$([\s\S]*?)\$/g, (match, math) => {
      try {
        return katex.renderToString(math, { displayMode: false, throwOnError: false });
      } catch (e) {
        return match;
      }
    });

    return html;
  } catch (err) {
    return text;
  }
};
