import os
import sys
import re
import base64
import urllib.request
import ssl
from PIL import Image as PILImage

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print total page count."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, total_pages):
        page_num = self._pageNumber
        width, height = A4

        # Skip header/footer on cover page if page 1
        if page_num > 1:
            self.saveState()
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#4338CA"))
            self.drawString(40, height - 30, "CONSUMER LENS")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(125, height - 30, "|  Technical Architecture & Deployment · DoCA PS 26034")

            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.75)
            self.line(40, height - 36, width - 40, height - 36)
            self.restoreState()

        # Footer on all pages
        self.saveState()
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(40, 42, width - 40, 42)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(40, 28, "Confidential · Legal Metrology Division, Department of Consumer Affairs, GoI")

        page_str = f"Page {page_num} of {total_pages}"
        self.drawRightString(width - 40, 28, page_str)
        self.restoreState()


def download_mermaid_diagram(code_str, index, cache_dir="scripts/diagrams"):
    os.makedirs(cache_dir, exist_ok=True)
    out_path = os.path.join(cache_dir, f"diagram_{index}.png")
    
    # If already downloaded and valid (>1000 bytes), use cache
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        return out_path

    clean_code = code_str.strip()
    import json
    payload = {"code": clean_code, "mermaid": {"theme": "default"}}
    b64_code = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("ascii")
    url = f"https://mermaid.ink/img/{b64_code}"

    ctx = ssl._create_unverified_context()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=25) as resp:
            data = resp.read()
            with open(out_path, "wb") as f:
                f.write(data)
            print(f"[Mermaid] Downloaded diagram {index} ({len(data)} bytes)")
            return out_path
    except Exception as e:
        print(f"[Mermaid Error] Failed to fetch diagram {index}: {e}")
        return None


def convert_markdown_to_pdf(md_path, pdf_path):
    print(f"Reading {md_path}...")
    with open(md_path, "r", encoding="utf-8") as f:
        raw_text = f.read()

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#1E1B4B")     # Deep indigo
    c_accent = colors.HexColor("#4F46E5")      # Indigo 600
    c_text = colors.HexColor("#0F172A")        # Slate 900
    c_muted = colors.HexColor("#475569")       # Slate 600
    c_card_bg = colors.HexColor("#F8FAFC")     # Slate 50
    c_border = colors.HexColor("#CBD5E1")      # Slate 300

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=c_primary,
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        "CustomH1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=c_primary,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        "CustomH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=c_accent,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        "CustomBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13.5,
        textColor=c_text,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        "CustomBullet",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12.5,
        textColor=c_text,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        "CustomCode",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#1E293B"),
        leftIndent=8,
        rightIndent=8,
        spaceAfter=0
    )

    caption_style = ParagraphStyle(
        "CaptionStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=10,
        textColor=c_muted,
        alignment=1, # Center
        spaceBefore=4,
        spaceAfter=12
    )

    callout_style = ParagraphStyle(
        "CalloutStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155")
    )

    meta_style = ParagraphStyle(
        "MetaHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#312E81")
    )

    story = []

    # Parse blocks: Code blocks (```), Mermaid blocks (```mermaid), Tables, Lists, Headings, Text
    # Split text into sections or lines
    lines = raw_text.splitlines()

    in_code_block = False
    in_mermaid_block = False
    code_lang = ""
    current_code_lines = []
    mermaid_count = 0
    in_table = False
    current_table_lines = []

    def clean_md_inline(text):
        # bold **text**
        t = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
        # italic *text*
        t = re.sub(r'\*(.*?)\*', r'<i>\1</i>', t)
        # code `code`
        t = re.sub(r'`([^`]+)`', r'<font face="Courier" color="#3B82F6"><b>\1</b></font>', t)
        # clean stray markdown links [text](url) -> <u>text</u>
        t = re.sub(r'\[(.*?)\]\((.*?)\)', r'<u>\1</u>', t)
        return t

    def flush_table(table_lines):
        if not table_lines:
            return None
        # Parse markdown table
        rows_data = []
        is_first_row = True
        for row_str in table_lines:
            if not row_str.strip() or re.match(r'^\s*\|?\s*[-:]+[-| :]*$', row_str):
                continue
            cells = [c.strip() for c in row_str.strip().strip("|").split("|")]
            cell_paras = []
            for c in cells:
                c_clean = clean_md_inline(c)
                if is_first_row:
                    p = Paragraph(f"<b>{c_clean}</b>", ParagraphStyle(
                        "TH", fontName="Helvetica-Bold", fontSize=8, leading=10.5, textColor=colors.white
                    ))
                else:
                    p = Paragraph(c_clean, ParagraphStyle(
                        "TD", fontName="Helvetica", fontSize=7.5, leading=10, textColor=c_text
                    ))
                cell_paras.append(p)
            rows_data.append(cell_paras)
            is_first_row = False

        if not rows_data:
            return None

        # Max width is ~515 pt (A4 width 595 - 80 margins)
        col_count = len(rows_data[0])
        col_width = 515.0 / col_count

        t = Table(rows_data, colWidths=[col_width] * col_count)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ]))
        return t

    i = 0
    total_lines = len(lines)
    while i < total_lines:
        line = lines[i]

        # Check for code blocks
        if line.strip().startswith("```"):
            if not in_code_block:
                in_code_block = True
                code_lang = line.strip()[3:].strip().lower()
                current_code_lines = []
                in_mermaid_block = (code_lang == "mermaid")
                i += 1
                continue
            else:
                # Ending code block
                in_code_block = False
                if in_mermaid_block:
                    mermaid_count += 1
                    mermaid_code = "\n".join(current_code_lines)
                    img_path = download_mermaid_diagram(mermaid_code, mermaid_count)
                    if img_path and os.path.exists(img_path):
                        # Calculate proportional scaling
                        try:
                            pil_img = PILImage.open(img_path)
                            img_w, img_h = pil_img.size
                            max_w = 515.0  # page width - margins
                            max_h = 420.0  # max diagram height
                            scale = min(max_w / img_w, max_h / img_h, 1.0)
                            render_w = img_w * scale
                            render_h = img_h * scale

                            # Add a nice bordered card for the diagram
                            rl_img = Image(img_path, width=render_w, height=render_h)
                            diagram_table = Table([[rl_img]], colWidths=[max_w])
                            diagram_table.setStyle(TableStyle([
                                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
                                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
                                ('TOPPADDING', (0, 0), (-1, -1), 8),
                                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                            ]))
                            fig_title = {
                                1: "End-to-End System Architecture (4-Tier Ingestion to Enforcement)",
                                2: "System Design cum User Interaction Flow (Field Officer vs. Cloud Services)",
                                3: "Codified LMPC Rules, 2011 Regulatory Decision Engine",
                                4: "Role-Based Access Control (RBAC) & Enforcement Hierarchy",
                                5: "Multi-Cloud High-Availability Deployment Architecture",
                                6: "Relational Schema & Entity-Relationship Data Model"
                            }.get(mermaid_count, "System Architecture Specification")
                            story.append(Spacer(1, 6))
                            story.append(KeepTogether([
                                diagram_table,
                                Paragraph(f"Figure {mermaid_count}: {fig_title}", caption_style)
                            ]))
                        except Exception as img_err:
                            print(f"Image processing error: {img_err}")
                    in_mermaid_block = False
                else:
                    # Regular code block (e.g. dockerfile or bash)
                    code_text = "<br/>".join([
                        c.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace(" ", "&nbsp;")
                        for c in current_code_lines
                    ])
                    p_code = Paragraph(code_text, code_style)
                    code_box = Table([[p_code]], colWidths=[515])
                    code_box.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                        ('TOPPADDING', (0, 0), (-1, -1), 6),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                        ('LEFTPADDING', (0, 0), (-1, -1), 8),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                    ]))
                    story.append(Spacer(1, 4))
                    story.append(code_box)
                    story.append(Spacer(1, 6))

                current_code_lines = []
                i += 1
                continue

        if in_code_block:
            current_code_lines.append(line)
            i += 1
            continue

        # Check for Markdown Tables
        if line.strip().startswith("|") and "|" in line.strip()[1:]:
            current_table_lines.append(line)
            i += 1
            # Check if next line is also table
            while i < total_lines and lines[i].strip().startswith("|") and "|" in lines[i].strip()[1:]:
                current_table_lines.append(lines[i])
                i += 1
            tbl = flush_table(current_table_lines)
            if tbl:
                story.append(Spacer(1, 4))
                story.append(tbl)
                story.append(Spacer(1, 8))
            current_table_lines = []
            continue

        stripped = line.strip()

        # Horizontal separator
        if stripped in ["---", "***", "___"]:
            story.append(Spacer(1, 6))
            story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#E2E8F0"), spaceAfter=10))
            i += 1
            continue

        # Empty line
        if not stripped:
            i += 1
            continue

        # Headings
        if stripped.startswith("# "):
            title_text = clean_md_inline(stripped[2:].strip())
            # Main Banner for Document Title
            banner_data = [
                [Paragraph("<b>MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION</b><br/>"
                           "<font size=8 color='#4338CA'>Department of Consumer Affairs (DoCA) · Legal Metrology Division · Govt. of India</font>", meta_style)],
                [Paragraph(f"<b>{title_text}</b>", title_style)],
                [Paragraph("<font color='#475569'><b>Smart India Hackathon 2024 · Problem Statement ID: 26034</b><br/>"
                           "Automated Compliance Verification of Packaged Commodities under Legal Metrology Rules, 2011</font>", body_style)]
            ]
            banner_tbl = Table(banner_data, colWidths=[515])
            banner_tbl.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EEF2FF")),
                ('BOX', (0, 0), (-1, -1), 1.25, colors.HexColor("#6366F1")),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ]))
            story.append(banner_tbl)
            story.append(Spacer(1, 12))
            i += 1
            # Skip the next few meta lines if they repeat ministry
            while i < total_lines and (lines[i].startswith("**Ministry") or lines[i].startswith("**Department") or lines[i].startswith("**Problem")):
                i += 1
            continue

        if stripped.startswith("## "):
            h1_text = clean_md_inline(stripped[3:].strip())
            story.append(Paragraph(h1_text, h1_style))
            i += 1
            continue

        if stripped.startswith("### "):
            h2_text = clean_md_inline(stripped[4:].strip())
            story.append(Paragraph(h2_text, h2_style))
            i += 1
            continue

        # Bullet items
        if stripped.startswith("- ") or stripped.startswith("* "):
            bullet_text = clean_md_inline(stripped[2:].strip())
            story.append(Paragraph(f"&bull;&nbsp;&nbsp;{bullet_text}", bullet_style))
            i += 1
            continue

        # Numbered list
        num_match = re.match(r'^(\d+)\.\s+(.*)$', stripped)
        if num_match:
            num_idx = num_match.group(1)
            num_text = clean_md_inline(num_match.group(2))
            story.append(Paragraph(f"<b>{num_idx}.</b>&nbsp;&nbsp;{num_text}", bullet_style))
            i += 1
            continue

        # Math formula callout box
        if stripped.startswith("$$") and stripped.endswith("$$"):
            formula_text = stripped.strip("$").strip()
            formula_p = Paragraph(f"<font face='Courier' color='#1E1B4B'><b>{formula_text}</b></font>", callout_style)
            formula_tbl = Table([[formula_p]], colWidths=[515])
            formula_tbl.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#94A3B8")),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))
            story.append(Spacer(1, 4))
            story.append(formula_tbl)
            story.append(Spacer(1, 4))
            i += 1
            continue

        # Normal Paragraph
        p_text = clean_md_inline(stripped)
        story.append(Paragraph(p_text, body_style))
        i += 1

    print("Building PDF document with ReportLab...")
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"SUCCESS: Generated {pdf_path} ({os.path.getsize(pdf_path)} bytes)")

if __name__ == "__main__":
    md_file = "ARCHITECTURE.md"
    pdf_file = "ARCHITECTURE.pdf"
    convert_markdown_to_pdf(md_file, pdf_file)
