# Mankind Pharma Website - User Story for ZERO QA

## Website Overview
**URL:** https://www.mankindpharma.com/
**Type:** Corporate Pharmaceutical Website
**Purpose:** Company information, investor relations, product showcase, contact portal

---

## User Story 1: Website Visitor Information Journey

**As a** healthcare professional or potential investor  
**I want to** explore Mankind Pharma's company information, products, and contact them  
**So that** I can learn about the company and reach out for business inquiries

### Acceptance Criteria:
1. Homepage loads with company branding and navigation
2. All main menu sections are accessible (Company, R&D, Safety & Sustainability, International, Investor Center, Careers)
3. Contact form is functional and validates input
4. Corporate contact information is visible and accurate
5. Social media links redirect to official profiles
6. Shop button redirects to partner e-commerce site

---

## User Story 2: Contact Form Submission

**As a** visitor with a business inquiry  
**I want to** submit a contact form with my details  
**So that** Mankind Pharma can respond to my query

### Test Scenario for ZERO:

```
Test Flow: Contact Form End-to-End
URL: https://www.mankindpharma.com/

Steps:
1. Open homepage and verify it loads completely
2. Navigate to Contact Us page (click GET IN TOUCH in footer or find Contact link)
3. Verify contact form is displayed with all fields
4. Fill form:
   - What can we help with: Select first available option
   - Full Name: "Test User"
   - Mobile No: "9876543210"
   - Email: "testuser@example.com"
   - Message: "This is a test inquiry about your pharmaceutical products"
5. Click SUBMIT button
6. Verify success message or confirmation appears
```

---

## User Story 3: Corporate Information Access

**As an** investor or analyst  
**I want to** access corporate information and investor relations data  
**So that** I can make informed investment decisions

### Test Scenario for ZERO:

```
Test Flow: Investor Center Navigation
URL: https://www.mankindpharma.com/

Steps:
1. Navigate to homepage
2. Click on "Investor Center" in main navigation
3. Verify page loads with financial information
4. Check for annual reports, quarterly results sections
5. Verify investor contact email is visible
6. Navigate back to homepage using logo click
```

---

## Website Element Selectors Reference

### Navigation Elements:
- **Main Navigation:** Header menu items (Company, R&D & Innovation, etc.)
- **Logo:** Mankind Pharma logo in header - links to homepage
- **Shop Button:** External link to epiclovestore.com
- **Footer Navigation:** Quick Links section

### Contact Form Selectors:
- **Dropdown:** "What can we help with" - select element
- **Full Name:** Input field for name
- **Mobile No:** Input field for phone number
- **Email:** Input field for email address
- **Message:** Textarea for message content
- **Submit:** SUBMIT button

### Footer Elements:
- **Social Icons:** Facebook, Twitter/X, LinkedIn, YouTube
- **Legal Links:** Code of Conduct, Privacy Policy, Disclaimer
- **Quick Links:** iTAP, Blog, Media, Career, FAQ's, etc.

---

## Priority Test Flows for ZERO

### High Priority:
1. **Homepage → Contact Us → Form Submission**
2. **Homepage → Company → About Us Information**
3. **Homepage → Products → Product Categories**
4. **Logo Navigation (Any Page → Homepage)**
5. **Adverse Event Reporting Access**

### Medium Priority:
1. **Social Media Links Verification**
2. **Investor Center Access**
3. **Career Page Navigation**
4. **Blog/Media Section Access**
5. **Mobile Responsive Testing**

### Low Priority:
1. **Click-to-Call Phone Links**
2. **Mailto Email Links**
3. **Footer Legal Pages**

---

## Domain-Specific Notes for ZERO

### Website Characteristics:
- **Corporate website** - Not an e-commerce platform
- **No login required** for public pages
- **Multi-language:** Primarily English content
- **Forms:** Contact form is primary interactive element
- **External Links:** Shop redirects to epiclovestore.com

### Expected Page Load Elements:
- Hero banner with company message
- Main navigation with dropdown menus
- Footer with contact info and quick links
- "Making healthcare more affordable" GST notice banner

### Form Validation Rules:
- All fields likely required
- Email must be valid format
- Mobile number format validation (India: 10 digits)
- Message minimum character requirement possible

---

## Sample Test Data

| Field | Valid Value | Invalid Value |
|-------|-------------|---------------|
| Full Name | Rajesh Kumar | |
| Mobile No | 9876543210 | 12345 |
| Email | test@example.com | invalidemail |
| Message | I am interested in learning more about your products | a |

---

## Recommended ZERO Configuration

```json
{
  "baseUrl": "https://www.mankindpharma.com/",
  "defaultTimeout": 30000,
  "waitForSelectors": true,
  "handlePopups": true,
  "screenshotOnFailure": true,
  "retryOnTimeout": true
}
```

---

## Notes for Automation:
1. Website may have anti-bot protection - use realistic timing
2. Contact form submission may show CAPTCHA - handle gracefully
3. Some pages may lazy-load content - wait for elements
4. External links open in new tabs - verify tab handling
5. Footer is consistent across pages - use for navigation verification
