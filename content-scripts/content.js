chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    const data = scrapeContent(request.options);
    sendResponse({ data });
  }
  return true;
});

function scrapeContent(options) {
  let result = "";

  if (options.format === "html" || options.format === "combined") {
    const html = document.documentElement.outerHTML;
    result += formatHTML(html);
  }

  if (options.format === "css" || options.format === "combined") {
    const styles = getAllStyles(options);
    result += "\n\n/* Styles */\n" + styles;
  }

  return result;
}

function formatHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return formatNode(doc.documentElement, 0);
}

function formatNode(node, level) {
  let result = "";
  const indent = "  ".repeat(level);

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent.replace(/\s+/g, " ").trim();
    if (text) {
      result += indent + text + "\n";
    }
    return result;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    result += indent + "<" + node.tagName.toLowerCase();

    const attributes = Array.from(node.attributes).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    for (const attr of attributes) {
      if (attr.value === "") {
        result += ` ${attr.name}`;
      } else {
        result += ` ${attr.name}="${attr.value}"`;
      }
    }

    const selfClosingTags = ["img", "br", "hr", "input", "meta", "link"];
    if (
      selfClosingTags.includes(node.tagName.toLowerCase()) &&
      node.childNodes.length === 0
    ) {
      result += " />\n";
      return result;
    }

    result += ">\n";

    for (const child of node.childNodes) {
      result += formatNode(child, level + 1);
    }

    result += indent + "</" + node.tagName.toLowerCase() + ">\n";
  }

  return result;
}

function getAllStyles(options) {
  let styles = "";

  if (options.includeInline) {
    const elements = document.querySelectorAll("*[style]");
    elements.forEach((element) => {
      const inlineStyles = element
        .getAttribute("style")
        .split(";")
        .filter((style) => style.trim())
        .map((style) => style.trim())
        .sort()
        .join(";\n  ");

      styles += `/* Inline styles for ${element.tagName.toLowerCase()}${
        element.id ? `#${element.id}` : ""
      } */\n`;
      styles += `{\n  ${inlineStyles};\n}\n\n`;
    });
  }

  if (options.includeExternal) {
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach((sheet) => {
      try {
        const rules = Array.from(sheet.cssRules);
        rules.forEach((rule) => {
          if (rule instanceof CSSStyleRule) {
            const selector = rule.selectorText;
            const declarations = rule.style.cssText
              .split(";")
              .filter((style) => style.trim())
              .map((style) => style.trim())
              .sort()
              .join(";\n  ");

            styles += `${selector} {\n  ${declarations};\n}\n\n`;
          } else if (rule instanceof CSSMediaRule) {
            styles += `@media ${rule.conditionText} {\n`;
            Array.from(rule.cssRules).forEach((mediaRule) => {
              const declarations = mediaRule.style.cssText
                .split(";")
                .filter((style) => style.trim())
                .map((style) => style.trim())
                .sort()
                .join(";\n    ");

              styles += `  ${mediaRule.selectorText} {\n    ${declarations};\n  }\n`;
            });
            styles += "}\n\n";
          } else if (rule instanceof CSSKeyframesRule) {
            styles += `@keyframes ${rule.name} {\n`;
            Array.from(rule.cssRules).forEach((keyframe) => {
              const declarations = keyframe.style.cssText
                .split(";")
                .filter((style) => style.trim())
                .map((style) => style.trim())
                .sort()
                .join(";\n    ");

              styles += `  ${keyframe.keyText} {\n    ${declarations};\n  }\n`;
            });
            styles += "}\n\n";
          } else if (rule instanceof CSSImportRule) {
            styles += `@import "${rule.href}";\n\n`;
          } else {
            styles += `${rule.cssText}\n\n`;
          }
        });
      } catch (e) {
        console.warn("Could not access stylesheet:", e);
      }
    });
  }

  return styles;
}
