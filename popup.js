document.addEventListener('DOMContentLoaded', () => {
  const markdownInput = document.getElementById('markdownInput');
  const preview = document.getElementById('preview');
  const convertButton = document.getElementById('convertButton');
  const copyButton = document.getElementById('copyButton');
  const pdfButton = document.getElementById('pdfButton');
  const themeToggle = document.getElementById('themeToggle');
  const directionToggle = document.getElementById('directionToggle');
  const notification = document.getElementById('notification');
  const notificationText = document.getElementById('notificationText');

  // Initialize marked with better typography
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
  });

  // Initialize theme
  function setTheme(isDark) {
    if (isDark) {
      document.body.classList.add('dark');
      themeToggle.querySelector('i').classList.remove('fa-moon');
      themeToggle.querySelector('i').classList.add('fa-sun');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.classList.remove('dark');
      themeToggle.querySelector('i').classList.remove('fa-sun');
      themeToggle.querySelector('i').classList.add('fa-moon');
      localStorage.setItem('darkMode', 'false');
    }
  }

  // Initialize text direction
  function setDirection(isRTL) {
    if (isRTL) {
      preview.style.direction = 'rtl';
      directionToggle.querySelector('i').classList.remove('fa-align-right');
      directionToggle.querySelector('i').classList.add('fa-align-left');
      localStorage.setItem('textDirection', 'rtl');
    } else {
      preview.style.direction = 'ltr';
      directionToggle.querySelector('i').classList.remove('fa-align-left');
      directionToggle.querySelector('i').classList.add('fa-align-right');
      localStorage.setItem('textDirection', 'ltr');
    }
  }

  // Load saved theme
  const savedDarkMode = localStorage.getItem('darkMode') === 'true';
  setTheme(savedDarkMode);

  // Load saved direction
  const savedDirection = localStorage.getItem('textDirection') === 'rtl';
  setDirection(savedDirection);

  // Theme toggle
  themeToggle.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark');
    setTheme(isDark);
  });

  // Direction toggle
  directionToggle.addEventListener('click', () => {
    const isRTL = preview.style.direction !== 'rtl';
    setDirection(isRTL);
  });

  // Show notification with animation
  function showNotification(message, duration = 2000) {
    notificationText.textContent = message;
    notification.style.opacity = '1';
    notification.style.transform = 'scale(1)';
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'scale(0.95)';
    }, duration);
  }

  // Update preview as user types with debounce
  let updateTimeout;
  markdownInput.addEventListener('input', () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      const markdown = markdownInput.value;
      try {
        preview.innerHTML = marked.parse(markdown);
      } catch (error) {
        console.error('Markdown parsing error:', error);
      }
    }, 150);
  });

  // Copy formatted text
  copyButton.addEventListener('click', async () => {
    try {
      const previewContent = preview.innerHTML;
      const plainText = preview.innerText;

      // For modern browsers
      if (navigator.clipboard && navigator.clipboard.write) {
        const clipboardItem = new ClipboardItem({
          'text/html': new Blob([previewContent], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        // Fallback for older browsers
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = plainText;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);
      }
      
      showNotification('✓ Text copied successfully');
    } catch (err) {
      console.error('Failed to copy text:', err);
      showNotification('❌ Failed to copy text');
    }
  });

  // Convert markdown to RTF and download
  convertButton.addEventListener('click', () => {
    const markdown = markdownInput.value;
    if (!markdown.trim()) {
      showNotification('❌ Please enter some text first');
      return;
    }
    
    try {
      const html = marked.parse(markdown);
      const rtf = convertToRtf(html);
      downloadRtf(rtf);
      showNotification('✓ RTF file downloaded successfully');
    } catch (error) {
      console.error('Conversion error:', error);
      showNotification('❌ Conversion failed');
    }
  });

  // Convert and download as PDF
  pdfButton.addEventListener('click', async () => {
    try {
      showNotification('⌛ Generating PDF...');

      // Create a temporary container
      const container = document.createElement('div');
      container.innerHTML = preview.innerHTML;
      
      // Add a wrapper for better page break control
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 210mm;
        background-color: white;
        color: black;
        font-family: Arial, sans-serif;
        line-height: 1.6;
        font-size: 12pt;
        z-index: -1000;
      `;
      
      container.style.cssText = `
        padding: 20mm;
        box-sizing: border-box;
      `;

      // Apply text direction
      container.style.direction = preview.style.direction || 'ltr';

      // Style tables
      container.querySelectorAll('table').forEach(table => {
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '10pt';
        table.style.pageBreakInside = 'avoid';
      });

      container.querySelectorAll('th, td').forEach(cell => {
        cell.style.border = '1px solid #ddd';
        cell.style.padding = '8pt';
        cell.style.textAlign = container.style.direction === 'rtl' ? 'right' : 'left';
      });

      // Style lists with proper numbering
      container.querySelectorAll('ol').forEach(ol => {
        ol.style.listStyleType = 'decimal';
        ol.style.marginBottom = '10pt';
        ol.style.paddingLeft = '25pt';
        ol.style.pageBreakInside = 'avoid';
      });

      container.querySelectorAll('ul').forEach(ul => {
        ul.style.listStyleType = 'disc';
        ul.style.marginBottom = '10pt';
        ul.style.paddingLeft = '25pt';
        ul.style.pageBreakInside = 'avoid';
      });

      // Prevent page breaks inside list items
      container.querySelectorAll('li').forEach(item => {
        item.style.marginBottom = '5pt';
        item.style.pageBreakInside = 'avoid';
      });

      // Handle images
      container.querySelectorAll('img').forEach(img => {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.marginBottom = '10pt';
        img.style.pageBreakInside = 'avoid';
        
        // Add wrapper div to prevent image splitting across pages
        const wrapper = document.createElement('div');
        wrapper.style.pageBreakInside = 'avoid';
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
      });

      // Style headings
      container.querySelectorAll('h1').forEach(h1 => {
        h1.style.fontSize = '24pt';
        h1.style.marginBottom = '10pt';
        h1.style.fontWeight = 'bold';
        h1.style.pageBreakAfter = 'avoid';
        h1.style.pageBreakBefore = 'always';
      });

      container.querySelectorAll('h2').forEach(h2 => {
        h2.style.fontSize = '20pt';
        h2.style.marginBottom = '8pt';
        h2.style.fontWeight = 'bold';
        h2.style.pageBreakAfter = 'avoid';
      });

      container.querySelectorAll('h3').forEach(h3 => {
        h3.style.fontSize = '16pt';
        h3.style.marginBottom = '6pt';
        h3.style.fontWeight = 'bold';
        h3.style.pageBreakAfter = 'avoid';
      });

      // Style paragraphs
      container.querySelectorAll('p').forEach(p => {
        p.style.marginBottom = '10pt';
        p.style.pageBreakInside = 'avoid';
      });

      // Style code blocks
      container.querySelectorAll('pre').forEach(pre => {
        pre.style.fontFamily = 'Consolas, monospace';
        pre.style.backgroundColor = '#f5f5f5';
        pre.style.padding = '10pt';
        pre.style.borderRadius = '3pt';
        pre.style.marginBottom = '10pt';
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordBreak = 'break-word';
        pre.style.pageBreakInside = 'avoid';
      });

      container.querySelectorAll('code').forEach(code => {
        code.style.fontFamily = 'Consolas, monospace';
        code.style.backgroundColor = '#f5f5f5';
        code.style.padding = '2pt 4pt';
        code.style.borderRadius = '3pt';
        code.style.fontSize = '11pt';
      });

      // Add container to wrapper and wrapper to document
      wrapper.appendChild(container);
      document.body.appendChild(wrapper);

      // Convert to canvas with better settings
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollY: -window.scrollY,
        height: wrapper.offsetHeight,
        windowHeight: wrapper.offsetHeight,
        onclone: function(clonedDoc) {
          const clonedWrapper = clonedDoc.querySelector('#pdf-wrapper');
          if (clonedWrapper) {
            clonedWrapper.style.transform = 'none';
          }
        }
      });

      // Remove temporary elements
      document.body.removeChild(wrapper);

      // Convert to PDF with better page handling
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 0;
      
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;
      
      // First page
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth - (margin * 2), imgHeight);
      heightLeft -= (pageHeight - margin);

      // Additional pages
      while (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imgHeight;
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth - (margin * 2), imgHeight);
        heightLeft -= (pageHeight - margin);
      }

      // Save PDF
      pdf.save('document.pdf');
      showNotification('✓ PDF downloaded successfully');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      showNotification('❌ Failed to generate PDF');
    }
  });

});

function convertToRtf(html) {
  // Basic RTF header
  let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}\\viewkind4\\uc1\n';
  
  // Create a temporary div to parse HTML
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Convert HTML to RTF
  function processNode(node) {
    let result = '';
    
    if (node.nodeType === Node.TEXT_NODE) {
      // Escape special RTF characters and handle Arabic text
      return node.textContent
        .replace(/\\/g, '\\\\')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\n/g, '\\par\n');
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      
      // Handle different HTML tags
      switch (tag) {
        case 'h1':
          result += '{\\fs48\\b ';
          break;
        case 'h2':
          result += '{\\fs36\\b ';
          break;
        case 'h3':
          result += '{\\fs27\\b ';
          break;
        case 'b':
        case 'strong':
          result += '{\\b ';
          break;
        case 'i':
        case 'em':
          result += '{\\i ';
          break;
        case 'u':
          result += '{\\ul ';
          break;
        case 'p':
          result += '{\\par ';
          break;
        case 'br':
          result += '\\par\n';
          break;
        case 'ul':
          result += '{\\par ';
          break;
        case 'ol':
          result += '{\\par ';
          break;
        case 'li':
          result += '\\bullet\\tab ';
          break;
        case 'code':
          result += '{\\f1 ';
          break;
      }
      
      // Process child nodes
      for (const child of node.childNodes) {
        result += processNode(child);
      }
      
      // Close RTF groups for tags that need it
      if (['h1', 'h2', 'h3', 'b', 'strong', 'i', 'em', 'u', 'p', 'ul', 'ol', 'code'].includes(tag)) {
        result += '}';
      }
      
      // Add extra newline after certain block elements
      if (['p', 'h1', 'h2', 'h3', 'ul', 'ol'].includes(tag)) {
        result += '\\par\n';
      }
    }
    
    return result;
  }
  
  rtf += processNode(div);
  rtf += '}';
  
  return rtf;
}

function downloadRtf(rtfContent) {
  const blob = new Blob([rtfContent], { type: 'application/rtf' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `converted-${timestamp}.rtf`;
  a.click();
  
  URL.revokeObjectURL(url);
}
