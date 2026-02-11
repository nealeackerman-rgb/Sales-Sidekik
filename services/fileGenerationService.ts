
import PptxGenJS from "pptxgenjs";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import saveAs from "file-saver";
import { SlideData, DocData, BrandConfig } from "../types";

// Helper to sanitize hex codes (remove #, ensure 6 chars)
const sanitizeColor = (color: string, fallback: string) => {
  const clean = color.replace(/[^0-9A-F]/gi, '');
  return clean.length === 6 ? clean : fallback;
};

// --- PowerPoint Generator ---
export const generatePresentationFile = async (filename: string, slides: SlideData[], brandConfig?: BrandConfig) => {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  // 1. Resolve Branding (with Fallbacks)
  const primaryColor = sanitizeColor(brandConfig?.primaryColor || "4F46E5", "4F46E5"); // Default Indigo
  const secondaryColor = sanitizeColor(brandConfig?.secondaryColor || "E0E7FF", "E0E7FF"); // Default Light Indigo
  const companyName = brandConfig?.companyName || "Client";

  // Define Master Slide (Branding)
  pptx.defineSlideMaster({
    title: "MASTER_SLIDE",
    background: { color: "FFFFFF" },
    objects: [
      // Top Bar (Brand Color)
      { rect: { x: 0, y: 0, w: "100%", h: 0.85, fill: { color: primaryColor } } },
      // Bottom Bar (Footer area)
      { rect: { x: 0, y: 5.35, w: "100%", h: 0.25, fill: { color: "F3F4F6" } } },
      { text: { text: `Generated for ${companyName} by Sales Sidekik`, options: { x: 0.5, y: 5.4, w: "90%", align: "right", color: "9CA3AF", fontSize: 9 } } }
    ]
  });

  slides.forEach((slideContent, index) => {
    // FIX 1: Make the Title Slide "Pop" (Solid Background)
    // We assume the first slide is always the title slide
    if (index === 0) {
      const slide = pptx.addSlide();
      slide.background = { color: primaryColor };
      
      // Centered Main Title
      slide.addText(slideContent.title, { 
        x: 0.5, y: 2.0, w: "90%", h: 1.5, 
        fontSize: 44, color: "FFFFFF", bold: true, align: "center", fontFace: "Arial"
      });
      
      // Subtitle / Branding
      slide.addText(`Prepared for ${companyName}`, { 
        x: 0.5, y: 3.5, w: "90%", h: 0.5, 
        fontSize: 18, color: secondaryColor, align: "center", fontFace: "Arial" 
      });
      
      return; // Skip the rest of the loop for this slide
    }

    // --- Standard Content Slides ---
    const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
    const layout = slideContent.layoutType || 'text';

    // 1. Common: Title (White text on the colored bar)
    slide.addText(slideContent.title, { 
      x: 0.5, y: 0.15, w: "90%", h: 0.6, 
      fontSize: 28, color: "FFFFFF", bold: true, align: "left", fontFace: "Arial"
    });

    // FIX 3: Tighter Margins & Bigger Fonts
    // Content usually starts around y=1.0 or 1.2 now (previously 1.5)

    // 2. Layout Logic
    if (layout.startsWith('split_')) {
      // --- SPLIT LAYOUT (Text + Image) ---
      const isImageRight = layout === 'split_right';
      
      // Define Zones
      const textX = isImageRight ? 0.5 : 5.2;
      const imageX = isImageRight ? 5.2 : 0.5;
      
      const region = slideContent.regions?.[0]; // Assume first region has text
      const imageRegion = slideContent.regions?.[1] || region; // Assume image is in second region or same

      // Draw Text Side
      if (region?.header) {
        slide.addText(region.header, { x: textX, y: 1.2, w: 4.3, h: 0.5, fontSize: 24, color: primaryColor, bold: true });
      }
      slide.addText(region?.content.map(b => ({ text: b, options: { breakLine: true } })) || [], {
        x: textX, y: 1.8, w: 4.3, h: 3.5, fontSize: 18, color: "333333", bullet: true, lineSpacing: 28
      });

      // Draw Image Side (Placeholder if no actual image URL provided)
      if (imageRegion?.imageUrl) {
        slide.addImage({ path: imageRegion.imageUrl, x: imageX, y: 1.2, w: 4.3, h: 3.5 });
      } else {
        // Placeholder for "Professional Look"
        slide.addShape(pptx.ShapeType.rect, { x: imageX, y: 1.2, w: 4.3, h: 3.5, fill: { color: "F3F4F6" }, line: { color: "D1D5DB" } });
        slide.addText("Image Placeholder", { x: imageX, y: 1.2, w: 4.3, h: 3.5, align: "center", color: "9CA3AF" });
      }

    } else if (layout === 'team') {
      // --- TEAM SLIDE ---
      const members = slideContent.regions || [];
      const cardW = 2.0;
      const gap = 0.5;
      const startX = (10 - (members.length * (cardW + gap))) / 2; // Center them

      members.forEach((member, i) => {
        const xPos = startX + (i * (cardW + gap));
        // 1. Headshot Placeholder (Circle-ish)
        if (member.imageUrl) {
            slide.addImage({ path: member.imageUrl, x: xPos + 0.25, y: 1.5, w: 1.5, h: 1.5, sizing: { type: "contain", w: 1.5, h: 1.5 } });
        } else {
            slide.addShape(pptx.ShapeType.ellipse, { x: xPos + 0.25, y: 1.5, w: 1.5, h: 1.5, fill: { color: secondaryColor } });
        }
        // 2. Name
        slide.addText(member.header || "Name", { x: xPos, y: 3.2, w: cardW, h: 0.4, fontSize: 18, bold: true, align: "center", color: "333333" });
        // 3. Title/Role
        slide.addText(member.content.join('\n'), { x: xPos, y: 3.6, w: cardW, h: 1.0, fontSize: 12, align: "center", color: "666666" });
      });

    } else if (layout === 'logo_grid') {
      // --- LOGO/TRUST WALL ---
      const logos = slideContent.regions || [];
      const cols = 4;
      const cellW = 2.0;
      const cellH = 1.0;
      const startX = 1.0;
      
      logos.forEach((logo, i) => {
        const colI = i % cols;
        const rowI = Math.floor(i / cols);
        const xPos = startX + (colI * (cellW + 0.2));
        const yPos = 1.5 + (rowI * (cellH + 0.2));
        
        slide.addShape(pptx.ShapeType.rect, { x: xPos, y: yPos, w: cellW, h: cellH, fill: { color: "FFFFFF" }, line: { color: "E5E7EB" } });
        slide.addText(logo.header || "Logo", { x: xPos, y: yPos, w: cellW, h: cellH, align: "center", fontSize: 14, color: "9CA3AF" });
      });

    } else if (layout === 'process') {
      // --- PROCESS FLOW (CHEVRONS) ---
      const steps = slideContent.regions || [];
      const stepW = 8.5 / (steps.length || 1);
      
      steps.forEach((step, i) => {
        const xPos = 0.75 + (i * stepW);
        // Draw Chevron Shape
        slide.addShape(pptx.ShapeType.chevron, { x: xPos, y: 2.0, w: stepW - 0.2, h: 2.5, fill: { color: primaryColor } });
        // Number
        slide.addText(`${i + 1}`, { x: xPos + 0.2, y: 2.2, w: stepW - 0.6, h: 0.5, fontSize: 32, bold: true, align: "center", color: "FFFFFF" });
        // Header
        slide.addText(step.header || "", { x: xPos + 0.2, y: 2.8, w: stepW - 0.6, h: 0.5, fontSize: 14, bold: true, align: "center", color: "FFFFFF" });
        // Bullets
        slide.addText(step.content.join('\n'), { x: xPos + 0.4, y: 3.3, w: stepW - 1.0, h: 1.0, fontSize: 11, align: "center", color: "FFFFFF" });
      });

    } else if (layout === 'case_study') {
      // --- CASE STUDY (3 Columns + Quote) ---
      // 1. Draw 3 Columns (Challenge, Solution, Impact)
      const headers = ["Challenge", "Solution", "Impact"];
      const colW = 2.8;
      
      headers.forEach((h, i) => {
         const xPos = 0.5 + (i * 3.0);
         // Header Bar
         slide.addText(h, { x: xPos, y: 1.2, w: colW, h: 0.4, fontSize: 16, bold: true, color: primaryColor, fill: { color: secondaryColor }, align: "center" });
      });

      // Content for columns. Expect regions 0, 1, 2.
      slideContent.regions?.slice(0, 3).forEach((reg, i) => {
         const xPos = 0.5 + (i * 3.0);
         slide.addText(reg.content.map(b=>({text:b, options:{breakLine:true}})), { x: xPos, y: 1.7, w: colW, h: 3.0, fontSize: 14, color: "333333", bullet: true, valign: "top" });
      });

      // 2. Bottom Quote Bar (Region 4)
      const quote = slideContent.regions?.[3];
      if (quote) {
         slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 4.8, w: 9.0, h: 0.8, fill: { color: "F3F4F6" } });
         slide.addText(`“${quote.content[0]}”`, { x: 0.7, y: 4.8, w: 7.0, h: 0.8, fontSize: 14, italic: true, color: "4B5563" });
         slide.addText(`- ${quote.header}`, { x: 7.8, y: 4.8, w: 1.5, h: 0.8, fontSize: 12, bold: true, color: primaryColor });
      }

    } else if (layout === 'kpi') {
      // KPI Dashboard
      const kpiCount = slideContent.regions?.length || 3;
      const gap = 0.5;
      const totalW = 9.0;
      const itemW = (totalW - (gap * (kpiCount - 1))) / kpiCount;
      const startX = (10.0 - totalW) / 2;
      
      slideContent.regions?.forEach((reg, i) => {
        const xPos = startX + (i * (itemW + gap));
        
        // KPI Box Background
        slide.addShape(pptx.ShapeType.roundRect, { 
            x: xPos, y: 1.8, w: itemW, h: 2.5, 
            fill: { color: "F8FAFC" }, line: { color: "E2E8F0", width: 1 } 
        });

        // Big Number (Increased to 72pt)
        slide.addText(reg.header || "0", {
          x: xPos, y: 1.9, w: itemW, h: 1.2,
          fontSize: 72, color: primaryColor, bold: true, align: "center"
        });
        // Label
        slide.addText(reg.content.join('\n'), {
          x: xPos, y: 3.2, w: itemW, h: 1.0,
          fontSize: 18, color: "64748B", align: "center"
        });
      });

    } else if (layout.startsWith('chart_')) {
      // Native Charts
      // 1. Text Summary (Left)
      slide.addText(slideContent.chartData?.summary.map(b => ({ text: b, options: { breakLine: true } })) || [], {
        x: 0.5, y: 1.5, w: 3.0, h: 4.0,
        fontSize: 16, color: "333333", bullet: true
      });

      // 2. Chart (Right)
      const chartType = layout === 'chart_pie' ? pptx.ChartType.doughnut : pptx.ChartType.bar;
      const data = [{
        name: "Series 1",
        labels: slideContent.chartData?.labels || [],
        values: slideContent.chartData?.values || []
      }];
      
      slide.addChart(chartType, data, { 
        x: 4.0, y: 1.5, w: 5.5, h: 4.0,
        chartColors: [primaryColor, secondaryColor, "9CA3AF"],
        showTitle: false,
        showLegend: layout === 'chart_pie',
        showValue: true
      });

    } else if (layout === 'statement') {
      // Statement / Quote
      const text = slideContent.regions?.[0]?.content.join('\n') || (slideContent.bullets?.[0] || "");
      slide.addText(text, {
        x: 1.0, y: 2.0, w: 8.0, h: 2.0,
        fontSize: 36, color: primaryColor, align: "center", bold: true, fontFace: "Arial"
      });

    } else if (layout === 'grid') {
      // Dynamic Grid
      const cols = slideContent.gridConfig?.columns || 2;
      const rows = slideContent.gridConfig?.rows || 1;
      const gap = 0.3;
      const totalW = 9.0;
      const cellW = (totalW - (gap * (cols - 1))) / cols;
      const totalH = 4.0;
      const cellH = totalH / rows; 

      slideContent.regions?.forEach((region, index) => {
        const colIndex = index % cols;
        const rowIndex = Math.floor(index / cols);
        const xPos = 0.5 + (colIndex * (cellW + gap));
        const yPos = 1.2 + (rowIndex * (cellH + gap));

        if (region.header) {
          slide.addText(region.header, {
            x: xPos, y: yPos, w: cellW, h: 0.5,
            fontSize: 20, color: primaryColor, bold: true, align: "center", fill: { color: secondaryColor }
          });
        }

        const contentY = region.header ? yPos + 0.6 : yPos;
        const contentH = region.header ? cellH - 0.6 : cellH;

        slide.addText(region.content.map(b => ({ text: b, options: { breakLine: true } })), {
          x: xPos, y: contentY, w: cellW, h: contentH,
          fontSize: 16, color: "333333", bullet: true, valign: "top"
        });
      });
    } else {
        // Default Text Layout (Increased to 22pt)
        const bullets = (slideContent.bullets || []).map(b => ({ text: b, options: { breakLine: true } }));
        slide.addText(bullets, {
          x: 0.5, y: 1.2, w: "90%", h: 4.5,
          fontSize: 22, color: "333333", bullet: true, lineSpacing: 32, fontFace: "Arial"
        });
    }
    
    // Speaker Notes
    if (slideContent.speakerNotes) slide.addNotes(slideContent.speakerNotes);
  });

  await pptx.writeFile({ fileName: `${filename}.pptx` });
};

// Helper to parse inline markdown for Docx
const parseMarkdownText = (text: string): TextRun[] => {
  const runs: TextRun[] = [];
  // Matches **bold** and *italic*
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  const parts = text.split(regex);

  parts.forEach(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true }));
    } else if (part) {
      runs.push(new TextRun({ text: part }));
    }
  });
  return runs;
};

// --- Word Doc Generator ---
export const generateWordDoc = async (filename: string, data: DocData) => {
  const docSections = data.sections.flatMap(section => {
    // 1. Section Header (Heading 1)
    const blocks: Paragraph[] = [
      new Paragraph({
        text: section.header,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 }
      })
    ];

    // 2. Parse Content (Markdown -> Paragraphs)
    const lines = section.content.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('### ')) {
        // Heading 3
        blocks.push(new Paragraph({
          children: parseMarkdownText(trimmed.replace(/^###\s+/, '')),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        }));
      } else if (trimmed.startsWith('## ')) {
        // Heading 2
        blocks.push(new Paragraph({
          children: parseMarkdownText(trimmed.replace(/^##\s+/, '')),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }));
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        // Bullet List
        blocks.push(new Paragraph({
          children: parseMarkdownText(trimmed.replace(/^[-*•]\s+/, '')),
          bullet: { level: 0 },
          spacing: { after: 50 }
        }));
      } else {
        // Regular Text
        blocks.push(new Paragraph({
          children: parseMarkdownText(trimmed),
          spacing: { after: 120 }
        }));
      }
    });

    return blocks;
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: data.title,
          heading: HeadingLevel.TITLE,
          spacing: { after: 400 }
        }),
        ...docSections
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
};
