"use strict";

/**
 * Two-level business taxonomy: domain (Banking) → sub-domain (Insurance).
 *
 * Keys mirror `WEBSITE_TYPES` in ../constants so the sub-domain layer is purely
 * additive — a domain with no matching sub-domain still classifies exactly as
 * before. Each sub-domain carries its own QA priorities and critical flows so
 * generated cases talk about claims and premiums rather than "Navigation".
 */

const SUB_DOMAINS = {
  BANKING_FINANCE: {
    INSURANCE: {
      name: "Insurance",
      indicators: [
        "insurance", "policy", "premium", "claim", "insured", "coverage", "sum assured",
        "nominee", "term plan", "health insurance", "motor insurance", "life insurance",
        "deductible", "policy renewal", "riders",
      ],
      urlPatterns: ["insur", "policybazaar", "acko", "hdfcergo", "icicilombard", "bajajallianz", "maxlife", "tataaig"],
      testPriorities: [
        "Premium Quote Calculator", "Policy Purchase", "Premium Payment",
        "Claim Intimation", "Policy Renewal", "Document Upload", "KYC Verification",
      ],
      criticalFlows: ["Get Quote to Policy Purchase", "Claim Registration", "Policy Renewal and Premium Payment"],
    },
    LENDING: {
      name: "Lending and Loans",
      indicators: [
        "loan", "emi", "interest rate", "tenure", "eligibility", "disbursal", "credit score",
        "personal loan", "home loan", "repayment", "collateral", "foreclosure", "sanction",
      ],
      urlPatterns: ["loan", "lend", "credit", "bajajfinserv"],
      testPriorities: [
        "EMI Calculator", "Loan Eligibility Check", "Application Form",
        "Document Upload", "Credit Score Check", "Repayment Schedule",
      ],
      criticalFlows: ["Loan Application Submission", "EMI Calculation", "Document Verification"],
    },
    PAYMENTS: {
      name: "Payments and Wallets",
      indicators: [
        "wallet", "upi", "payment gateway", "transfer money", "recharge", "bill payment",
        "transaction history", "send money", "qr code", "payout", "refund", "settlement",
      ],
      urlPatterns: ["pay", "upi", "wallet", "razorpay", "paytm", "phonepe", "stripe"],
      testPriorities: [
        "Add Money", "Money Transfer", "Bill Payment", "Transaction History",
        "Refund Handling", "Payment Failure Retry",
      ],
      criticalFlows: ["Money Transfer", "Bill Payment", "Failed Payment Recovery"],
    },
    WEALTH: {
      name: "Wealth and Investments",
      indicators: [
        "mutual fund", "portfolio", "sip", "invest", "nav", "equity", "demat", "stocks",
        "trading", "returns", "risk profile", "asset allocation", "dividend",
      ],
      urlPatterns: ["invest", "wealth", "zerodha", "groww", "mutualfund", "upstox"],
      testPriorities: [
        "Portfolio Dashboard", "Fund Discovery", "SIP Setup", "Order Placement",
        "Returns Calculator", "KYC Onboarding",
      ],
      criticalFlows: ["Investment Order Placement", "SIP Creation", "Portfolio Valuation"],
    },
    CARDS: {
      name: "Cards",
      indicators: [
        "credit card", "debit card", "card statement", "reward points", "card limit",
        "annual fee", "cashback", "block card", "cvv", "billing cycle",
      ],
      urlPatterns: ["card"],
      testPriorities: [
        "Card Comparison", "Card Application", "Statement View",
        "Rewards Redemption", "Limit Management", "Card Blocking",
      ],
      criticalFlows: ["Card Application", "Statement and Payment", "Rewards Redemption"],
    },
    RETAIL_BANKING: {
      name: "Retail Banking",
      indicators: [
        "savings account", "current account", "net banking", "account balance", "ifsc",
        "branch locator", "fixed deposit", "passbook", "cheque", "account statement", "open account",
      ],
      urlPatterns: ["bank", "netbanking"],
      testPriorities: [
        "Secure Login", "Account Summary", "Fund Transfer",
        "Statement Download", "Beneficiary Management", "Branch and ATM Locator",
      ],
      criticalFlows: ["Secure Login and Session Handling", "Fund Transfer", "Account Statement Retrieval"],
    },
  },

  ECOMMERCE: {
    FASHION: {
      name: "Fashion and Apparel",
      indicators: [
        "apparel", "clothing", "size chart", "footwear", "fashion", "dress", "size guide",
        "fit", "collection", "wardrobe", "ethnic wear",
      ],
      urlPatterns: ["myntra", "ajio", "fashion", "zara", "nykaafashion"],
      testPriorities: [
        "Size Selection", "Product Filters", "Wishlist",
        "Cart and Checkout", "Returns and Exchange", "Style Recommendations",
      ],
      criticalFlows: ["Browse to Purchase", "Size and Variant Selection", "Return Initiation"],
    },
    GROCERY: {
      name: "Grocery and Daily Essentials",
      indicators: [
        "grocery", "vegetables", "fruits", "dairy", "delivery slot", "pincode",
        "basket", "staples", "fresh", "supermarket", "substitute",
      ],
      urlPatterns: ["bigbasket", "blinkit", "grocery", "zepto", "instamart", "jiomart"],
      testPriorities: [
        "Pincode Serviceability", "Category Browse", "Delivery Slot Selection",
        "Cart and Substitutions", "Checkout", "Order Tracking",
      ],
      criticalFlows: ["Serviceability Check to Checkout", "Delivery Slot Booking", "Order Tracking"],
    },
    ELECTRONICS: {
      name: "Electronics and Appliances",
      indicators: [
        "electronics", "specifications", "warranty", "laptop", "smartphone", "gadget",
        "appliance", "compare", "emi option", "installation",
      ],
      urlPatterns: ["croma", "reliancedigital", "electronic", "vijaysales"],
      testPriorities: [
        "Specification Comparison", "Product Filters", "Warranty Information",
        "EMI Options", "Stock Availability", "Cart and Checkout",
      ],
      criticalFlows: ["Compare to Purchase", "EMI Selection", "Warranty Registration"],
    },
    BEAUTY: {
      name: "Beauty and Personal Care",
      indicators: [
        "beauty", "skincare", "cosmetics", "makeup", "fragrance", "haircare",
        "shade", "ingredients", "serum",
      ],
      urlPatterns: ["nykaa", "beauty", "sephora", "purplle"],
      testPriorities: [
        "Shade Selection", "Product Reviews", "Offers and Bundles",
        "Wishlist", "Cart and Checkout",
      ],
      criticalFlows: ["Shade Discovery to Purchase", "Offer Application", "Review Submission"],
    },
    HOME_LIVING: {
      name: "Home and Furniture",
      indicators: [
        "furniture", "home decor", "mattress", "kitchenware", "interior",
        "sofa", "bedding", "dimensions", "assembly",
      ],
      urlPatterns: ["pepperfry", "urbanladder", "furniture", "ikea"],
      testPriorities: [
        "Room Category Browse", "Dimension Details", "Delivery and Installation",
        "EMI Options", "Cart and Checkout",
      ],
      criticalFlows: ["Browse to Purchase", "Installation Scheduling", "Bulk Cart Management"],
    },
  },

  HEALTHCARE_PHARMA: {
    PHARMACY: {
      name: "Pharmacy and e-Pharmacy",
      indicators: [
        "pharmacy", "medicine", "prescription", "tablet", "dosage", "refill",
        "generic substitute", "upload prescription", "chemist", "composition",
      ],
      urlPatterns: ["pharmacy", "netmeds", "1mg", "pharmeasy", "apollopharmacy", "medplus"],
      testPriorities: [
        "Medicine Search", "Prescription Upload", "Substitute Suggestions",
        "Cart and Checkout", "Delivery Tracking", "Dosage Information",
      ],
      criticalFlows: ["Prescription Upload to Order", "Medicine Search and Purchase", "Refill Reminder"],
    },
    DIAGNOSTICS: {
      name: "Diagnostics and Labs",
      indicators: [
        "lab test", "diagnostic", "blood test", "sample collection", "report download",
        "pathology", "health checkup", "phlebotomist", "fasting",
      ],
      urlPatterns: ["lab", "diagnostic", "thyrocare", "healthians", "metropolis"],
      testPriorities: [
        "Test Search", "Package Comparison", "Home Collection Slot",
        "Report Download", "Patient Details", "Payment",
      ],
      criticalFlows: ["Test Booking to Sample Collection", "Report Retrieval", "Health Package Purchase"],
    },
    TELEMEDICINE: {
      name: "Telemedicine and Online Consultation",
      indicators: [
        "consult", "doctor", "appointment", "video consultation", "specialist",
        "symptom", "book appointment", "follow up", "e-prescription",
      ],
      urlPatterns: ["practo", "telemed", "consult", "mfine"],
      testPriorities: [
        "Doctor Search", "Specialty Filters", "Appointment Booking",
        "Video Consult Join", "E-Prescription", "Payment and Refund",
      ],
      criticalFlows: ["Doctor Discovery to Consultation", "Appointment Rescheduling", "Prescription Delivery"],
    },
    HOSPITAL: {
      name: "Hospital and Clinic",
      indicators: [
        "hospital", "clinic", "opd", "emergency", "specialities", "surgeon",
        "patient portal", "visiting hours", "department", "ward",
      ],
      urlPatterns: ["hospital", "clinic", "fortis", "apollohospitals", "manipal"],
      testPriorities: [
        "Department Directory", "Doctor Profiles", "Appointment Request",
        "Emergency and Location Info", "Patient Portal Login", "Health Packages",
      ],
      criticalFlows: ["Find Doctor to Appointment", "Emergency Information Access", "Patient Portal Access"],
    },
  },

  OTT_STREAMING: {
    VIDEO_VOD: {
      name: "Video on Demand",
      indicators: [
        "watch now", "episode", "season", "series", "movie", "watchlist",
        "continue watching", "subtitle", "trailer", "video quality",
      ],
      urlPatterns: ["netflix", "primevideo", "hotstar", "zee5", "sonyliv", "aha"],
      testPriorities: [
        "Content Discovery", "Playback Controls", "Watchlist",
        "Subtitle and Audio Tracks", "Resume Playback", "Subscription Paywall",
      ],
      criticalFlows: ["Browse to Playback", "Resume Watching", "Subscription Upgrade"],
    },
    LIVE_SPORTS: {
      name: "Live Sports Streaming",
      indicators: [
        "live score", "match", "tournament", "highlights", "commentary",
        "fixtures", "live stream", "innings", "leaderboard",
      ],
      urlPatterns: ["sport", "cricket", "espn", "fancode", "willow"],
      testPriorities: [
        "Live Stream Start", "Score Widget", "Match Schedule",
        "Highlights Playback", "Quality Switching", "Match Notifications",
      ],
      criticalFlows: ["Live Match Playback", "Schedule to Reminder", "Highlights Discovery"],
    },
    MUSIC_AUDIO: {
      name: "Music and Audio Streaming",
      indicators: [
        "playlist", "album", "artist", "song", "podcast", "shuffle",
        "lyrics", "queue", "audio quality",
      ],
      urlPatterns: ["spotify", "gaana", "wynk", "saavn", "music", "audible"],
      testPriorities: [
        "Search and Discovery", "Playback Queue", "Playlist Management",
        "Offline Download", "Subscription Paywall",
      ],
      criticalFlows: ["Search to Playback", "Playlist Creation", "Offline Download"],
    },
    KIDS: {
      name: "Kids and Family",
      indicators: [
        "kids", "cartoon", "parental control", "age rating", "nursery",
        "child profile", "educational video",
      ],
      urlPatterns: ["kids", "junior", "cartoon"],
      testPriorities: [
        "Kids Profile Switch", "Parental Controls", "Age-Appropriate Catalog",
        "Playback Time Limits", "Content Filters",
      ],
      criticalFlows: ["Kids Profile Setup", "Parental Control Enforcement", "Safe Content Playback"],
    },
  },

  TRAVEL_BOOKING: {
    FLIGHTS: {
      name: "Flights",
      indicators: [
        "flight", "airline", "departure", "arrival", "one way", "round trip",
        "baggage", "boarding pass", "pnr", "web check-in", "fare",
      ],
      urlPatterns: ["flight", "indigo", "vistara", "emirates", "airindia"],
      testPriorities: [
        "Flight Search", "Fare Filters and Sort", "Traveller Details",
        "Seat and Baggage Add-ons", "Payment", "Booking Management",
      ],
      criticalFlows: ["Search to Ticket Issuance", "Web Check-in", "Cancellation and Refund"],
    },
    HOTELS: {
      name: "Hotels and Stays",
      indicators: [
        "hotel", "room", "check-in", "check-out", "guest", "night",
        "amenities", "resort", "room type", "occupancy",
      ],
      urlPatterns: ["hotel", "oyo", "agoda", "marriott", "taj"],
      testPriorities: [
        "Destination Search", "Date and Guest Selection", "Room Comparison",
        "Cancellation Policy", "Payment", "Booking Voucher",
      ],
      criticalFlows: ["Search to Room Booking", "Date Modification", "Cancellation and Refund"],
    },
    RAIL_BUS: {
      name: "Rail and Bus",
      indicators: [
        "train", "bus", "seat", "berth", "boarding point", "irctc",
        "sleeper", "route", "platform", "pnr status",
      ],
      urlPatterns: ["rail", "irctc", "redbus", "abhibus"],
      testPriorities: [
        "Route Search", "Seat and Berth Selection", "Boarding Point",
        "Passenger Details", "Payment", "Ticket Status",
      ],
      criticalFlows: ["Route Search to Ticket", "Seat Selection", "PNR Status Check"],
    },
    PACKAGES: {
      name: "Holiday Packages",
      indicators: [
        "holiday package", "itinerary", "tour", "sightseeing", "package price",
        "travel package", "destination guide", "inclusions",
      ],
      urlPatterns: ["holiday", "package", "tour", "thomascook"],
      testPriorities: [
        "Package Discovery", "Itinerary Details", "Customisation",
        "Enquiry Form", "Payment Milestones",
      ],
      criticalFlows: ["Package Discovery to Enquiry", "Itinerary Customisation", "Booking Payment"],
    },
    CAR_RENTAL: {
      name: "Car Rental",
      indicators: [
        "car rental", "self drive", "pickup location", "drop off",
        "rental", "chauffeur", "security deposit", "per km",
      ],
      urlPatterns: ["rental", "zoomcar", "hertz", "avis"],
      testPriorities: [
        "Location and Date Search", "Vehicle Selection", "Pricing Breakup",
        "Licence and Documents", "Payment and Deposit",
      ],
      criticalFlows: ["Search to Vehicle Booking", "Licence Verification", "Extension and Return"],
    },
  },

  EDUCATION: {
    K12: {
      name: "K-12 Schooling",
      indicators: ["school", "grade", "syllabus", "cbse", "icse", "homework", "worksheet", "parent portal"],
      urlPatterns: ["school", "k12", "byju"],
      testPriorities: ["Grade and Subject Browse", "Lesson Playback", "Worksheet Download", "Parent Portal Login", "Progress Reports"],
      criticalFlows: ["Lesson Access", "Assignment Submission", "Progress Tracking"],
    },
    HIGHER_ED: {
      name: "Higher Education",
      indicators: ["university", "college", "admission", "degree", "semester", "faculty", "campus", "scholarship"],
      urlPatterns: ["edu", "ac.", "university", "college"],
      testPriorities: ["Programme Catalog", "Admission Application", "Fee Payment", "Student Portal Login", "Document Upload"],
      criticalFlows: ["Programme Discovery to Application", "Fee Payment", "Student Portal Access"],
    },
    TEST_PREP: {
      name: "Test Preparation",
      indicators: ["mock test", "exam", "question bank", "practice test", "rank", "solutions", "previous year"],
      urlPatterns: ["testprep", "unacademy", "exam"],
      testPriorities: ["Test Series Browse", "Mock Test Attempt", "Timer and Submission", "Score and Rank", "Solution Review"],
      criticalFlows: ["Mock Test Attempt to Result", "Test Series Purchase", "Performance Analytics"],
    },
    UPSKILLING: {
      name: "Professional Upskilling",
      indicators: ["course", "certificate", "instructor", "curriculum", "enroll", "bootcamp", "career track", "module"],
      urlPatterns: ["coursera", "udemy", "upgrad", "simplilearn"],
      testPriorities: ["Course Discovery", "Enrollment and Payment", "Content Access", "Progress Tracking", "Certificate Generation"],
      criticalFlows: ["Course Enrollment", "Learning Progression", "Certificate Download"],
    },
  },

  SAAS: {
    CRM_SALES: {
      name: "CRM and Sales",
      indicators: ["crm", "pipeline", "leads", "deals", "contacts", "sales team", "forecast", "opportunity"],
      urlPatterns: ["crm", "salesforce", "hubspot", "zoho"],
      testPriorities: ["Sign Up and Trial", "Lead Creation", "Pipeline Views", "Reporting", "Integrations", "Role Permissions"],
      criticalFlows: ["Trial Sign Up", "Lead to Deal Progression", "Report Generation"],
    },
    DEVTOOLS: {
      name: "Developer Tools",
      indicators: ["repository", "api", "sdk", "deploy", "pipeline", "documentation", "webhook", "cli", "build"],
      urlPatterns: ["github", "gitlab", "dev", "vercel", "netlify"],
      testPriorities: ["Sign Up and Auth", "Documentation Access", "API Key Management", "Project Creation", "Build and Deploy Status"],
      criticalFlows: ["Sign Up to First Project", "API Key Generation", "Deployment Trigger"],
    },
    ANALYTICS: {
      name: "Analytics and BI",
      indicators: ["dashboard", "metrics", "reports", "data source", "visualisation", "segments", "funnel", "cohort"],
      urlPatterns: ["analytics", "mixpanel", "amplitude", "looker"],
      testPriorities: ["Dashboard Rendering", "Data Source Connection", "Filter and Date Range", "Export", "Sharing Permissions"],
      criticalFlows: ["Connect Data Source to Dashboard", "Report Export", "Dashboard Sharing"],
    },
    HR_PAYROLL: {
      name: "HR and Payroll",
      indicators: ["payroll", "employee", "attendance", "leave", "onboarding", "payslip", "appraisal", "hrms"],
      urlPatterns: ["hr", "payroll", "darwinbox", "keka"],
      testPriorities: ["Employee Onboarding", "Leave Application", "Attendance Marking", "Payslip Generation", "Role-Based Access"],
      criticalFlows: ["Employee Onboarding", "Leave Approval", "Payroll Run"],
    },
    COLLABORATION: {
      name: "Collaboration and Productivity",
      indicators: ["workspace", "channel", "document", "comment", "share", "team", "notification", "meeting"],
      urlPatterns: ["slack", "notion", "asana", "trello", "atlassian"],
      testPriorities: ["Workspace Creation", "Invite and Permissions", "Real-time Collaboration", "Notifications", "Search"],
      criticalFlows: ["Workspace Setup and Invite", "Document Collaboration", "Notification Delivery"],
    },
  },

  FOOD_DELIVERY: {
    RESTAURANT_DELIVERY: {
      name: "Restaurant Delivery",
      indicators: ["restaurant", "menu", "cuisine", "dishes", "order food", "delivery time", "rating", "veg"],
      urlPatterns: ["swiggy", "zomato", "ubereats", "doordash"],
      testPriorities: ["Location Detection", "Restaurant Search", "Menu Customisation", "Cart and Coupons", "Checkout", "Order Tracking"],
      criticalFlows: ["Restaurant Discovery to Order", "Coupon Application", "Live Order Tracking"],
    },
    GROCERY_DELIVERY: {
      name: "Grocery Delivery",
      indicators: ["grocery", "instant delivery", "basket", "staples", "delivery slot", "pincode", "fresh"],
      urlPatterns: ["blinkit", "zepto", "instamart", "bigbasket"],
      testPriorities: ["Serviceability Check", "Category Browse", "Slot Selection", "Cart and Substitutions", "Checkout"],
      criticalFlows: ["Serviceability to Checkout", "Slot Booking", "Order Tracking"],
    },
    MEAL_SUBSCRIPTION: {
      name: "Meal Subscription",
      indicators: ["subscription", "meal plan", "weekly menu", "tiffin", "calories", "diet plan", "pause subscription"],
      urlPatterns: ["meal", "tiffin", "subscription"],
      testPriorities: ["Plan Comparison", "Subscription Purchase", "Menu Selection", "Pause and Resume", "Billing Cycle"],
      criticalFlows: ["Plan Purchase", "Subscription Pause and Resume", "Recurring Billing"],
    },
    CLOUD_KITCHEN: {
      name: "Cloud Kitchen and Brand Ordering",
      indicators: ["kitchen", "brand", "combo", "outlet", "pickup", "direct order"],
      urlPatterns: ["kitchen", "eatfit", "faasos"],
      testPriorities: ["Brand and Outlet Selection", "Combo Builder", "Cart and Checkout", "Pickup vs Delivery", "Order Status"],
      criticalFlows: ["Outlet Selection to Order", "Combo Customisation", "Order Status Updates"],
    },
  },

  RETAIL_STORE: {
    DEPARTMENT_STORE: {
      name: "Department Store",
      indicators: ["department", "floor", "brands", "offers", "showroom", "shopping mall", "gift card"],
      urlPatterns: ["saravana", "pantaloons", "shoppersstop", "lifestyle"],
      testPriorities: ["Store Locator", "Category Navigation", "Offers and Promotions", "Contact Information", "Gift Card Info"],
      criticalFlows: ["Store Discovery", "Offer Discovery", "Contact Enquiry"],
    },
    SUPERMARKET: {
      name: "Supermarket Chain",
      indicators: ["supermarket", "hypermarket", "daily needs", "store timings", "weekly offers", "loyalty card"],
      urlPatterns: ["dmart", "bigbazaar", "reliancefresh", "supermarket"],
      testPriorities: ["Branch Listing", "Store Timings", "Weekly Offers", "Loyalty Programme", "Category Browse"],
      criticalFlows: ["Branch Information Access", "Offer Browse", "Loyalty Enrolment"],
    },
    SPECIALTY_RETAIL: {
      name: "Specialty Retail",
      indicators: ["jewellery", "eyewear", "sportswear", "speciality", "boutique", "exclusive range"],
      urlPatterns: ["tanishq", "lenskart", "decathlon", "titan"],
      testPriorities: ["Collection Browse", "Store Locator", "Appointment Booking", "Product Enquiry", "Offers"],
      criticalFlows: ["Collection Browse to Enquiry", "Store Appointment", "Product Comparison"],
    },
    SHOWROOM: {
      name: "Showroom and Dealership",
      indicators: ["showroom", "dealer", "test drive", "book now", "models", "variants", "on road price"],
      urlPatterns: ["showroom", "dealer", "motors", "automobile"],
      testPriorities: ["Model Catalog", "Variant Comparison", "Dealer Locator", "Test Drive Booking", "Price Enquiry"],
      criticalFlows: ["Model Discovery to Test Drive", "Dealer Locator", "Price Enquiry Submission"],
    },
  },

  NEWS_MEDIA: {
    GENERAL_NEWS: {
      name: "General News",
      indicators: ["breaking", "headline", "top stories", "latest news", "editorial", "reporter", "live updates"],
      urlPatterns: ["news", "times", "ndtv", "bbc", "cnn", "hindu"],
      testPriorities: ["Homepage Content Load", "Category Navigation", "Article Reading", "Search", "Live Blog Updates"],
      criticalFlows: ["Headline to Article", "Category Browse", "Search and Read"],
    },
    BUSINESS_NEWS: {
      name: "Business and Market News",
      indicators: ["market", "sensex", "nifty", "stocks", "earnings", "economy", "ipo", "business news"],
      urlPatterns: ["moneycontrol", "economictimes", "bloomberg", "mint"],
      testPriorities: ["Market Widgets", "Ticker Accuracy", "Article Reading", "Watchlist", "Paywall Handling"],
      criticalFlows: ["Market Data Load", "Article Access and Paywall", "Watchlist Management"],
    },
    SPORTS_NEWS: {
      name: "Sports News",
      indicators: ["scorecard", "fixtures", "standings", "match report", "sports news", "player stats"],
      urlPatterns: ["sport", "cricbuzz", "espn", "goal"],
      testPriorities: ["Live Score Widget", "Fixtures and Results", "Article Reading", "Team and Player Pages", "Notifications"],
      criticalFlows: ["Live Score Access", "Fixture to Match Report", "Team Page Navigation"],
    },
    REGIONAL_NEWS: {
      name: "Regional and Language News",
      indicators: ["regional", "district", "state news", "local news", "language edition"],
      urlPatterns: ["dinamalar", "eenadu", "lokmat", "regional"],
      testPriorities: ["Language Switch", "Region Selection", "Article Rendering", "Font and Encoding", "Category Browse"],
      criticalFlows: ["Language and Region Selection", "Regional Article Reading", "Category Navigation"],
    },
  },

  MARKETPLACE: {
    MULTI_VENDOR_RETAIL: {
      name: "Multi-vendor Retail",
      indicators: ["seller", "vendor", "storefront", "fulfilled by", "seller rating", "marketplace"],
      urlPatterns: ["amazon", "flipkart", "ebay", "marketplace"],
      testPriorities: ["Seller Comparison", "Listing Search", "Cart across Sellers", "Checkout", "Returns per Seller"],
      criticalFlows: ["Search to Listing Purchase", "Multi-seller Cart", "Return and Refund"],
    },
    CLASSIFIEDS: {
      name: "Classifieds",
      indicators: ["post ad", "classified", "used", "second hand", "contact seller", "listing", "negotiable"],
      urlPatterns: ["olx", "quikr", "classified", "craigslist"],
      testPriorities: ["Listing Search and Filters", "Post an Ad", "Contact Seller", "Image Upload", "Listing Moderation"],
      criticalFlows: ["Search to Seller Contact", "Ad Posting", "Listing Management"],
    },
    RENTALS: {
      name: "Rentals and Real Estate",
      indicators: ["rent", "property", "tenant", "landlord", "bhk", "lease", "deposit", "furnished"],
      urlPatterns: ["magicbricks", "99acres", "nobroker", "housing", "airbnb"],
      testPriorities: ["Location Search", "Filter by Budget and Type", "Property Detail", "Site Visit Scheduling", "Enquiry Form"],
      criticalFlows: ["Search to Property Enquiry", "Site Visit Booking", "Saved Searches"],
    },
    SERVICES_MARKETPLACE: {
      name: "Services Marketplace",
      indicators: ["service provider", "book service", "professional", "technician", "slot", "at home service"],
      urlPatterns: ["urbancompany", "justdial", "services"],
      testPriorities: ["Service Catalog", "Slot Booking", "Provider Assignment", "Pricing Breakup", "Rating and Review"],
      criticalFlows: ["Service Discovery to Booking", "Slot Rescheduling", "Post-service Rating"],
    },
  },

  CORPORATE: {
    MANUFACTURING: {
      name: "Manufacturing and Industrial",
      indicators: ["manufacturing", "plant", "production", "industrial", "supply chain", "quality certification", "capacity"],
      urlPatterns: ["industries", "manufacturing", "steel", "cement"],
      testPriorities: ["Product and Capability Pages", "Plant Locations", "Enquiry Forms", "Certification Downloads", "Navigation"],
      criticalFlows: ["Capability Discovery to Enquiry", "Document Download", "Location Access"],
    },
    IT_SERVICES: {
      name: "IT and Consulting Services",
      indicators: ["consulting", "digital transformation", "case study", "solutions", "services", "capabilities", "insights"],
      urlPatterns: ["infosys", "tcs", "wipro", "accenture", "consulting"],
      testPriorities: ["Service Pages", "Case Studies", "Careers Portal", "Contact Forms", "Insights and Blog"],
      criticalFlows: ["Service Discovery to Contact", "Case Study Access", "Career Application"],
    },
    ENERGY_UTILITIES: {
      name: "Energy and Utilities",
      indicators: ["energy", "power", "renewable", "utility", "grid", "tariff", "bill payment", "outage"],
      urlPatterns: ["power", "energy", "electricity", "gas"],
      testPriorities: ["Tariff Information", "Bill Payment", "Outage Reporting", "New Connection Request", "Consumer Login"],
      criticalFlows: ["Bill Payment", "New Connection Request", "Outage Reporting"],
    },
    CONGLOMERATE: {
      name: "Conglomerate and Holding",
      indicators: ["group companies", "investor", "annual report", "leadership", "sustainability", "csr", "board of directors"],
      urlPatterns: ["group", "holdings", "corp"],
      testPriorities: ["Group Company Navigation", "Investor Relations", "Annual Report Downloads", "Leadership Pages", "Press Releases"],
      criticalFlows: ["Investor Document Access", "Group Company Navigation", "Media and Press Access"],
    },
  },

  SOCIAL_MEDIA: {
    SOCIAL_NETWORKING: {
      name: "Social Networking",
      indicators: ["feed", "friend", "follow", "post", "story", "timeline", "like", "comment"],
      urlPatterns: ["facebook", "instagram", "threads"],
      testPriorities: ["Authentication", "Feed Loading", "Post Creation", "Interactions", "Privacy Settings"],
      criticalFlows: ["Login to Feed", "Content Posting", "Social Interaction"],
    },
    PROFESSIONAL_NETWORKING: {
      name: "Professional Networking",
      indicators: ["connection", "resume", "recruiter", "job posting", "endorsement", "professional profile"],
      urlPatterns: ["linkedin", "naukri", "indeed"],
      testPriorities: ["Profile Completion", "Job Search", "Application Submission", "Connection Requests", "Messaging"],
      criticalFlows: ["Job Search to Application", "Profile Update", "Connection Request"],
    },
    MEDIA_SHARING: {
      name: "Media Sharing",
      indicators: ["upload", "channel", "subscriber", "views", "shorts", "reels", "thumbnail"],
      urlPatterns: ["youtube", "vimeo", "tiktok", "pinterest"],
      testPriorities: ["Content Upload", "Playback", "Channel Pages", "Subscriptions", "Recommendations"],
      criticalFlows: ["Upload to Publish", "Discovery to Playback", "Subscription Management"],
    },
    COMMUNITY_FORUM: {
      name: "Community and Forum",
      indicators: ["forum", "thread", "reply", "upvote", "moderator", "community", "discussion", "karma"],
      urlPatterns: ["reddit", "forum", "community", "discourse"],
      testPriorities: ["Thread Browse", "Post and Reply", "Voting", "Moderation Tools", "Search"],
      criticalFlows: ["Browse to Reply", "Thread Creation", "Voting and Moderation"],
    },
  },
};

/** Sub-domain configs for a domain key, or an empty object. */
function getSubDomains(domainKey) {
  return SUB_DOMAINS[String(domainKey || "").toUpperCase()] || {};
}

/** Whether a domain declares any sub-domains. */
function hasSubDomains(domainKey) {
  return Object.keys(getSubDomains(domainKey)).length > 0;
}

/** Candidate sub-domain names for a domain — used to constrain LLM inference. */
function subDomainNames(domainKey) {
  return Object.values(getSubDomains(domainKey)).map((config) => config.name);
}

/**
 * Resolve a sub-domain by key or by (case-insensitive) display name.
 * Lets an LLM reply with "Insurance" and still land on the curated config.
 */
function resolveSubDomain(domainKey, keyOrName) {
  const configs = getSubDomains(domainKey);
  const needle = String(keyOrName || "").trim().toLowerCase();
  if (!needle) return null;

  for (const [key, config] of Object.entries(configs)) {
    if (key.toLowerCase() === needle) return { key, ...config };
    if (String(config.name).toLowerCase() === needle) return { key, ...config };
  }
  return null;
}

module.exports = {
  SUB_DOMAINS,
  getSubDomains,
  hasSubDomains,
  subDomainNames,
  resolveSubDomain,
};
