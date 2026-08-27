# Legal Metrology (Packaged Commodities) Rules, 2011
## Complete Compliance Rule Base

---

## RULE 1 — Manufacturer / Packer / Importer Identity
**Rule Reference:** Rule 6(1)(a)
**Severity if violated:** CRITICAL

### Requirements
- Full name AND complete registered office address of the manufacturer, packer, or importer must be present.
- The role must be explicitly stated using one of: `Manufactured by` / `Packed by` / `Imported by` / `Marketed by` / `Brand Owner`.
- If manufacturer and packer are different entities, BOTH must be named separately with their respective roles.
- Address must include street, city, state, and PIN code.

### Violation Flags
- Name present but address missing
- Address present but no role qualifier
- PIN code or state missing from address
- Manufacturer and packer differ but only one is named

---

## RULE 2 — Generic / Common Name of Commodity
**Rule Reference:** Rule 6(1)(b)
**Severity if violated:** MAJOR

### Requirements
- The common or generic name of the product must be declared.
- Brand name alone is NOT sufficient.
- Example: "Maggi" is not enough — "Instant Noodles" must also appear.

### Violation Flags
- Only brand name present with no generic or common name

---

## RULE 3 — Maximum Retail Price (MRP)
**Rule Reference:** Rule 6(1)(c)
**Severity if violated:** CRITICAL

### Requirements
- MRP must appear in one of these exact formats:
  - `Maximum Retail Price Rs.___ Inclusive of all taxes`
  - `MRP Rs.___ Incl. of all taxes`
  - `MRP ₹___ Incl. of all taxes`
- Currency must be shown as `₹`, `Rs.`, or `INR`.
- Price must be declared up to two decimal places.
- MRP must be in bold and more prominent than surrounding text.
- Rounding rule: fractions below 50 paise → round down to preceding rupee; 50–95 paise → round to 50 paise.

### Violation Flags
- `Incl. of all taxes` phrase is missing
- No currency symbol present
- MRP not in bold or not prominent
- More than two decimal places
- Non-standard format (e.g., just `Price: 45`)
- MRP completely absent

---

## RULE 4 — Date of Manufacture / Packing / Import
**Rule Reference:** Rule 6(1)(d)
**Severity if violated:** MAJOR

### Requirements
- Month AND year must both be declared.
- Acceptable formats: words (`January 2024`), numerals (`01/2024`), or both.
- If date of manufacture and date of packing are different, BOTH must be declared separately.

### Violation Flags
- Only year present, no month
- Only day present (day alone is not valid)
- Date completely absent
- Manufacture and packing dates differ but only one is declared

---

## RULE 5 — Net Quantity
**Rule Reference:** Rule 6(1)(e), Rule 11, Rule 13
**Severity if violated:** CRITICAL

### Requirements
- Net quantity must be declared in SI units only.
- Unit selection rules:
  - Solid / semi-solid / viscous products → weight (g or kg)
  - Liquid products → volume (ml or L)
  - Products sold by number → number (N or U)
  - Quantity < 1 kg → declare in grams; quantity ≥ 1 kg → declare in kilograms
  - Quantity < 1 L → declare in ml; quantity ≥ 1 L → declare in litres
- Packaging weight must be EXCLUDED from net quantity.
- For edible oils (post 2023 amendment): if declared by volume, weight must ALSO be declared alongside.

### Violation Flags
- Non-SI units used (lbs, fl oz, etc.)
- No unit symbol — just a bare number
- Packaging weight appears to be included
- Edible oil declared by volume only without corresponding weight

---

## RULE 6 — Consumer Care / Grievance Redressal Details
**Rule Reference:** Rule 6(2)
**Severity if violated:** MAJOR

### Requirements
- All of the following must be present: name and address of the grievance contact, telephone number, and email address (if the company has one).
- A website URL alone is NOT sufficient.

### Violation Flags
- Phone number missing
- Email missing (when company has one)
- Only a website URL provided with no phone or email

---

## RULE 7 — Country of Origin
**Rule Reference:** Rule 6 (applicable to imported products only)
**Severity if violated:** MAJOR

### Requirements
- For ALL imported products, the country of manufacture must be explicitly stated.

### Violation Flags
- Product is imported but country of origin is absent

---

## RULE 8 — Best Before / Use By Date
**Rule Reference:** 2017 Amendment, effective 1 January 2018
**Severity if violated:** MAJOR

### Requirements
- For perishable commodities, a `Best Before` or `Use By` date must be declared.
- The qualifier `Best Before` or `Use By` must appear alongside the date — not just a bare date.

### Violation Flags
- Perishable product has no best before or use by date
- A date is present but the `Best Before` / `Use By` qualifier is missing

---

## RULE 9 — Unit Sale Price (USP)
**Rule Reference:** Rule 6(11), 2022 Amendment
**Severity if violated:** MINOR

### Requirements
- USP must be declared when MRP does not equal the unit price.
- Calculation rules:
  - Net quantity < 1 kg → USP per gram (₹/g)
  - Net quantity > 1 kg → USP per kilogram (₹/kg)
  - Net quantity < 1 L → USP per ml (₹/ml)
  - Net quantity > 1 L → USP per litre (₹/L)
- USP must be rounded to two decimal places.
- USP calculation must EXCLUDE any free or bonus quantity offered in the pack.
- USP is NOT required if MRP equals USP (e.g., a 1 kg pack where USP = MRP/kg = MRP itself).

### Violation Flags
- USP absent when required
- Not rounded to two decimal places
- Free/bonus quantity included in USP calculation

---

## RULE 10 — Font Size of Numerals
**Rule Reference:** Rule 7 + Table I, 2017 Amendment
**Severity if violated:** MAJOR

### Requirements
Minimum height of numerals (price, quantity, date when expressed in numbers) based on net quantity:

| Net Quantity | Min Height (Normal Print) | Min Height (Molded / Embossed) |
|---|---|---|
| < 200g or < 200ml | 1 mm | 2 mm |
| 200g – 500g or 200ml – 500ml | 2 mm | 4 mm |
| > 500g or > 500ml | 4 mm | 6 mm |

- Width of any letter or numeral must not be less than one-third of its height.
- Exception: numeral `1` and letters `i`, `I`, `l` are exempt from the width rule.

### Violation Flags
- Numeral height below threshold for the pack size
- Letter width less than one-third of height

---

## RULE 11 — Font Size of Letters (General Declaration Text)
**Rule Reference:** Rule 7(3)
**Severity if violated:** MAJOR

### Requirements
- Height of ALL letters in any declaration must be at least 1 mm.
- If blown, formed, molded, embossed, or perforated → minimum 2 mm.

### Violation Flags
- Any declaration text appears below 1 mm height

---

## RULE 12 — Principal Display Panel (PDP) Placement
**Rule Reference:** Rule 7
**Severity if violated:** MAJOR

### Requirements
- ALL declarations must appear on the Principal Display Panel (PDP).
- PDP is defined as:
  - Rectangular package → largest face (one entire side)
  - Cylindrical package → 40% of lateral surface area
  - Other shapes → 40% of total surface area
- Excluded from PDP area calculation: top, bottom, flanges of cans, shoulders and necks of bottles and jars.

### Violation Flags
- Key declarations found on the bottom or non-principal panels
- Declarations scattered across multiple non-adjacent panels

---

## RULE 13 — Spacing Around Net Quantity Declaration
**Rule Reference:** Rule 8
**Severity if violated:** MINOR

### Requirements
- The area immediately surrounding the net quantity declaration must be free of other printed information:
  - Above and below → clear space equal to the height of the quantity numeral
  - Left and right → clear space equal to double the height of the quantity numeral

### Violation Flags
- Other text printed immediately adjacent to the net quantity declaration with no clear separation

---

## RULE 14 — Language of Declarations
**Rule Reference:** Rule 9
**Severity if violated:** MAJOR

### Requirements
- All declarations must be in Hindi or English.
- Regional language is additionally permitted but cannot replace Hindi or English.

### Violation Flags
- Declarations appear only in a regional language with no Hindi or English version

---

## RULE 15 — Method of Declaring MRP and Quantity
**Rule Reference:** Rule 9(1)(b)
**Severity if violated:** MINOR

### Requirements
- MRP and net quantity must be painted, inscribed, or printed on the label.
- Rubber stamping alone is not a compliant method of declaration.

### Violation Flags
- MRP appears to be rubber stamped over existing print rather than printed/inscribed

---

## RULE 16 — e-Commerce Listing Declarations
**Rule Reference:** 2017 Amendment, effective 1 January 2018
**Severity if violated:** CRITICAL (for online listings)

### Requirements
For products displayed on digital or electronic platforms (Amazon, Flipkart, etc.), the following must be present in the product listing:
- Name and address of manufacturer / packer / importer
- Country of origin (for imports)
- Generic / common name of the commodity
- Net quantity
- Best Before / Use By date (if applicable to the product)
- Maximum Retail Price inclusive of all taxes
- Dimensions of the commodity (where relevant)

> **Note:** Date of manufacture / packing is explicitly EXEMPTED from e-commerce listing requirements.

### Violation Flags
- Manufacturer name or address missing from listing
- Country of origin missing (for imported products)
- Generic name missing
- Net quantity missing
- MRP missing or not stated as inclusive of all taxes
- Best Before date missing for perishable products listed online

---

## RULE 17 — Standard Pack Sizes
**Rule Reference:** Rule 5 + Second Schedule
**Severity if violated:** MAJOR

### Requirements
- Certain commodities may only be sold in prescribed standard quantities.
- Example — Mineral Water and Drinking Water must be sold only in:
  `100ml, 150ml, 200ml, 250ml, 300ml, 500ml, 750ml, 1L, 1.5L, 2L, 3L, 4L, 5L`, or multiples of 5L.
- Check the Second Schedule of the Rules for the full list of regulated commodities and their permitted pack sizes.

### Violation Flags
- Product falls in a regulated category but is sold in a non-standard pack size

---

## EXEMPTIONS — Do Not Apply Rules to These Products
**Rule Reference:** Rule 26

The following products are exempt from LMPC Rules and should not be checked:

- Packages less than 10 ml or 10 g (unless the product is tobacco)
- Fast food packed by hotels, restaurants, or similar establishments at the point of sale
- Scheduled and non-scheduled drugs covered by the Drugs (Price Control) Order, 1995
- Agricultural farm produce in packages above 50 kg
- Products labelled `Not for Retail Sale` (meant for institutional or industrial consumers)
- Products with net quantity above 25 kg or 25 L
- Cement and fertilizers in bags above 50 kg
- Medical devices — font size and format governed by Medical Devices Rules, 2017 instead (2025 Amendment)



*Source: Legal Metrology (Packaged Commodities) Rules, 2011 | Amendments: 2015, 2017, 2022, 2023, 2025 | Ministry of Consumer Affairs, Food & Public Distribution, Govt. of India*
