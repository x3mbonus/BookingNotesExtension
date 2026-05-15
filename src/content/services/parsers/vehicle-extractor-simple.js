// SIMPLIFIED EXTRACTOR - Works directly in content script (Manifest V3 compatible)
// Paste this into your content.js or use as a separate injection

// Platform detection and routing
window.extractCarData = function() {
  const hostname = window.location.hostname;

  if (hostname.includes('mobile.de')) {
    return window.extractMobileDeCarData();
  } else if (hostname.includes('otomoto.pl')) {
    return window.extractOtomotoCarData();
  }

  // Fallback for unknown platform
  return {
    url: window.location.href,
    extracted: new Date().toISOString(),
    basics: {},
    specs: {},
    features: [],
    price: {},
    dealer: {},
  };
};

// MOBILE.DE EXTRACTOR
window.extractMobileDeCarData = function() {
  const data = {
    url: window.location.href,
    extracted: new Date().toISOString(),
    basics: {},
    specs: {},
    features: [],
    price: {},
    dealer: {},
    photo_url: document.querySelector('meta[property="og:image"]')?.content || '',
  };

  // Extract vehicle name
  const vehicleTitle = document.querySelector('h2.dNpqi');
  if (vehicleTitle) data.basics.name = vehicleTitle.innerText.trim();

  const vehicleSubtitle = document.querySelector('.GOIOV.fqe3L');
  if (vehicleSubtitle) data.basics.subtitle = vehicleSubtitle.innerText.trim();

  // Extract all technical specs (the dt/dd pairs)
  document.querySelectorAll('dt[data-testid*="-item"]').forEach(dt => {
    const label = dt.innerText.trim();
    const ddElement = dt.nextElementSibling;
    if (ddElement && ddElement.tagName === 'DD') {
      data.specs[label] = ddElement.innerText.trim();
    }
  });

  // Extract make and model from specs or title
  // mobile.de often has "Make" and/or "Model" in specs
  for (const [label, value] of Object.entries(data.specs)) {
    if (label.toLowerCase().includes('make') || label.toLowerCase().includes('marke')) {
      data.basics.make = value.trim();
    }
    if (label.toLowerCase().includes('model')) {
      data.basics.model = value.trim();
    }
  }

  // Fallback: Extract make and model from title
  if (!data.basics.make && data.basics.name) {
    const parts = data.basics.name.split(/[-–•]/);
    if (parts.length >= 1) {
      const firstPart = parts[0].trim();
      const knownMakes = ['Toyota', 'Honda', 'BMW', 'Mercedes', 'Volkswagen', 'Audi', 'Ford', 'Opel', 'Skoda', 'Peugeot', 'Renault', 'Hyundai', 'Kia', 'Fiat', 'Citroen', 'SEAT', 'Mazda', 'Subaru', 'Volvo', 'Jeep', 'Nissan', 'Mitsubishi', 'Suzuki', 'Dodge', 'Chevrolet', 'GMC', 'Tesla', 'Porsche', 'Lamborghini', 'Ferrari', 'Jaguar', 'Range Rover'];
      if (knownMakes.some(m => firstPart.toLowerCase().includes(m.toLowerCase()))) {
        data.basics.make = firstPart;
      }
    }
  }

  if (!data.basics.model && data.basics.name) {
    const parts = data.basics.name.split(/[-–•]/);
    if (parts.length >= 2) {
      data.basics.model = parts[1].trim();
    }
  }

  // Extract features
  document.querySelectorAll('li.FtSYW').forEach(li => {
    const feature = li.innerText.split('\n')[0].trim();
    if (feature) data.features.push(feature);
  });

  // Extract price
  const priceElement = document.querySelector('[data-testid="vip-price-label"] .jjvdJ');
  if (priceElement) data.price.amount = priceElement.innerText.trim();

  const netPriceElement = document.querySelector('[data-testid="vip-price-label"] .ZD2EM');
  if (netPriceElement) data.price.netInfo = netPriceElement.innerText.trim();

  // Mark price as EUR for mobile.de
  data.price.currency = 'EUR';

  // Extract year from First Registration
  const firstRegElement = document.querySelector('[data-testid="vip-key-features-list-item-firstRegistration"]');
  if (firstRegElement) {
    const dateText = firstRegElement.querySelector('.geJSa')?.innerText.trim();
    if (dateText) {
      // Extract year from "MM/YYYY" format
      const yearMatch = dateText.match(/(\d{4})/);
      if (yearMatch) {
        data.specs['First Registration'] = dateText;
      }
    }
  }

  // Extract mileage
  const mileageElement = document.querySelector('[data-testid="vip-key-features-list-item-mileage"]');
  if (mileageElement) {
    const mileageText = mileageElement.querySelector('.geJSa')?.innerText.trim();
    if (mileageText) {
      data.specs['Mileage'] = mileageText;
    }
  }

  // Extract dealer info
  const dealerNameElement = document.querySelector('[data-testid="vip-dealer-box-content"] .GdlnG');
  if (dealerNameElement) data.dealer.name = dealerNameElement.innerText.trim();

  const addr1 = document.querySelector('[data-testid="vip-dealer-box-seller-address1"]');
  const addr2 = document.querySelector('[data-testid="vip-dealer-box-seller-address2"]');
  if (addr1) data.dealer.address1 = addr1.innerText.trim();
  if (addr2) data.dealer.address2 = addr2.innerText.trim();

  const ratingElement = document.querySelector('[data-testid="trust-box-dealer-rating-count"]');
  if (ratingElement) data.dealer.rating = ratingElement.innerText.trim();

  // Extract seller description (at the end)
  const descriptionElement = document.querySelector('[data-testid="vip-vehicle-description-text"]');
  if (descriptionElement) data.description = descriptionElement.innerText.trim();

  return data;
};

// OTOMOTO.PL EXTRACTOR
window.extractOtomotoCarData = function() {
  const data = {
    url: window.location.href,
    extracted: new Date().toISOString(),
    basics: {},
    specs: {},
    features: [],
    price: {},
    dealer: {},
    photo_url: document.querySelector('meta[property="og:image"]')?.content || '',
  };

  // Helper function to get value by data-testid with more robust sibling hunting
  const getValueByTestId = (testId) => {
    const element = document.querySelector(`[data-testid="${testId}"]`);
    if (!element) return null;

    // Try multiple strategies to find the value
    // Strategy 1: Look for p.font-normal as next sibling or in nearby container
    let valueElement = element.nextElementSibling;
    if (valueElement?.classList.contains('font-normal')) {
      return valueElement.innerText.trim();
    }

    // Strategy 2: Look in parent's next sibling
    const parent = element.parentElement;
    if (parent) {
      valueElement = parent.nextElementSibling;
      if (valueElement?.querySelector('p.font-normal')) {
        return valueElement.querySelector('p.font-normal').innerText.trim();
      }
      // Strategy 3: Look in parent's parent's next sibling
      const grandparent = parent.parentElement;
      if (grandparent) {
        valueElement = grandparent.nextElementSibling;
        if (valueElement?.querySelector('p.font-normal')) {
          return valueElement.querySelector('p.font-normal').innerText.trim();
        }
      }
    }

    // Strategy 4: Find any p.font-normal containing text after testid element
    const allPs = document.querySelectorAll('p.font-normal');
    for (let p of allPs) {
      if (p.parentElement?.parentElement?.contains(element) ||
          p.closest('button')?.contains(element) ||
          p.closest('div')?.contains(element)) {
        const text = p.innerText.trim();
        if (text && text !== 'Volkswagen' && text.length < 100) {
          return text;
        }
      }
    }

    return null;
  };

  // Extract vehicle title
  const titleElement = document.querySelector('h1.offer-title');
  if (titleElement) data.basics.name = titleElement.innerText.trim();

  // Extract basic info - parse from title if testid approach fails
  const make = getValueByTestId('make');
  const model = getValueByTestId('model');
  const version = getValueByTestId('version');
  if (make && make !== 'Volkswagen') data.basics.make = make;
  if (model && model !== 'Volkswagen') data.basics.model = model;
  if (version && version !== 'Volkswagen') data.basics.version = version;

  // Fallback: Try to extract make and model from title if not found
  if (!data.basics.make && data.basics.name) {
    // Split on common delimiters and take first part as make
    const parts = data.basics.name.split(/[-–•]/);
    if (parts.length >= 1) {
      const firstPart = parts[0].trim();
      // Common make names
      const knownMakes = ['Toyota', 'Honda', 'BMW', 'Mercedes', 'Volkswagen', 'Audi', 'Ford', 'Opel', 'Skoda', 'Peugeot', 'Renault', 'Hyundai', 'Kia', 'Fiat', 'Citroen', 'SEAT', 'Mazda', 'Subaru', 'Volvo', 'Jeep', 'Nissan', 'Mitsubishi', 'Suzuki', 'Dodge', 'Chevrolet', 'GMC', 'Tesla', 'Porsche', 'Lamborghini', 'Ferrari', 'Jaguar', 'Range Rover'];
      if (knownMakes.some(m => firstPart.toLowerCase().includes(m.toLowerCase()))) {
        data.basics.make = firstPart;
      }
    }
  }

  if (!data.basics.model && data.basics.name) {
    // Split on common delimiters and take second part as model
    const parts = data.basics.name.split(/[-–•]/);
    if (parts.length >= 2) {
      data.basics.model = parts[1].trim();
    }
  }

  // Extract price
  const priceAmount = document.querySelector('.offer-price__number');
  const priceCurrency = document.querySelector('.offer-price__currency');
  if (priceAmount) data.price.amount = priceAmount.innerText.trim();
  if (priceCurrency) data.price.currency = priceCurrency.innerText.trim();

  // Extract specifications - improved filtering
  const specFields = [
    'year', 'mileage', 'fuel_type', 'engine_capacity', 'engine_power',
    'body_type', 'gearbox', 'transmission', 'color', 'door_count',
    'generation', 'vin', 'co2_emissions', 'urban_consumption',
    'extra_urban_consumption'
  ];

  specFields.forEach(field => {
    const value = getValueByTestId(field);
    if (value && value !== 'Volkswagen' && value.length > 0) {
      // Convert snake_case to readable format
      const label = field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      data.specs[label] = value;
    }
  });

  // For otomoto - extract mileage directly from DOM pattern (data-testid="detail" with "km" text)
  // Because otomoto doesn't use standard testid names for mileage
  if (!data.specs.Mileage) {
    const detailDivs = document.querySelectorAll('[data-testid="detail"]');
    detailDivs.forEach(div => {
      const valueP = div.querySelector('p.font-normal');
      if (valueP) {
        const text = valueP.innerText.trim();
        // Check if this looks like mileage (contains "km")
        if (text.includes('km')) {
          data.specs['Mileage'] = text;
        }
      }
    });
  }

  // Extract features from ALL equipment sections including closed accordions
  // CRITICAL: Use textContent (not innerText) because innerText returns empty for aria-hidden=true elements
  const equipmentSection = document.querySelector('[data-testid="content-equipments-section"]');
  if (equipmentSection) {
    // Get all p.font-normal elements in equipment section
    const allParagraphs = equipmentSection.querySelectorAll('p.font-normal');

    // Known accordion category headers to exclude
    const categoryHeaders = new Set([
      'Wyposażenie',
      'Audio i multimedia',
      'Komfort i dodatki',
      'Systemy wspomagania kierowcy',
      'Osiągi i tuning',
      'Bezpieczeństwo'
    ]);

    allParagraphs.forEach(p => {
      // Use textContent instead of innerText - it works for hidden/collapsed elements
      const feature = p.textContent.trim();

      // Filter logic:
      // 1. Must have text content (>2 chars, <150 chars)
      // 2. Must not be a category header
      // 3. Must not already be in list
      if (feature &&
          feature.length > 2 &&
          feature.length < 150 &&
          !categoryHeaders.has(feature) &&
          !data.features.includes(feature)) {
        data.features.push(feature);
      }
    });
  }

  // Extract description
  const descriptionWrapper = document.querySelector('[data-testid="textWrapper"]');
  if (descriptionWrapper) {
    const descText = descriptionWrapper.innerText.trim();
    if (descText) data.description = descText;
  }

  return data;
};

// Function to copy to clipboard
window.copyCarDataToClipboard = async function(format = 'json') {
  const data = window.extractCarData();
  let text;

  if (format === 'json') {
    text = JSON.stringify(data, null, 2);
  } else {
    text = formatDataAsText(data);
  }

  try {
    await navigator.clipboard.writeText(text);
    return { success: true, text: text };
  } catch (err) {
    console.error('Copy failed:', err);
    return { success: false, error: err.message };
  }
};

// Helper: Abbreviate feature names for filename
function abbreviateFeature(feature) {
  const abbreviations = {
    'LED': 'LED',
    'Kamera': 'Kamera',
    'Navigation': 'Navi',
    'Navi': 'Navi',
    'Sitzheizung': 'SHZ',
    'Anhängerkupplung': 'AHK',
    'Anhänger': 'AHK',
    'Tempomat': 'Tempomat',
    'Cruise Control': 'Tempomat',
    'Aircondition': 'AC',
    'Air Conditioning': 'AC',
    'Allradantrieb': 'AWD',
    'All-Wheel Drive': 'AWD',
    'ABS': 'ABS',
    'Servolenkung': 'Servo',
    'Power Steering': 'Servo',
    'Elektrofenster': 'E-Windows',
    'Panoramadach': 'Panodach',
    'Lederausstattung': 'Leder',
    'Ledersitze': 'Leder',
    'Leather': 'Leder',
  };

  // Check for abbreviation match
  for (let [key, abbr] of Object.entries(abbreviations)) {
    if (feature.toLowerCase().includes(key.toLowerCase())) {
      return abbr;
    }
  }

  // Auto-abbreviate long words
  if (feature.length > 20) {
    return feature.substring(0, 10) + '...';
  }

  return feature;
}

// Helper: Generate smart filename from vehicle data
function generateSmartFilename(data, format) {
  const parts = [];

  // 0. Detect platform and add prefix
  let platform = 'unknown';
  if (data.url) {
    if (data.url.includes('mobile.de')) {
      platform = 'mobilede';
    } else if (data.url.includes('otomoto.pl')) {
      platform = 'otomoto';
    }
  }
  parts.push(platform);

  // 1. Extract model name - prefer structured model field, then parse from name
  let modelName = '';

  // Try to use the structured model field first (from data-testid extraction)
  if (data.basics.model && data.basics.model !== 'Volkswagen') {
    modelName = data.basics.model;
  } else if (data.basics.name) {
    // Parse from full name: look for known model names
    // Common VW models: Passat, Touran, Golf, Polo, Arteon, T-Roc, T-Cross, Tiguan, ID.3, ID.4, ID.5, Beetle, Up, Caddy
    const knownModels = ['Passat', 'Touran', 'Golf', 'Polo', 'Arteon', 'T-Roc', 'T-Cross', 'Tiguan', 'Beetle', 'Caddy', 'Up', 'ID'];
    const nameParts = data.basics.name.split(/\s+/);

    for (let i = 0; i < nameParts.length; i++) {
      const part = nameParts[i];
      // Check if part matches a known model name
      if (knownModels.some(model => part.includes(model))) {
        modelName = part;
        break;
      }
    }

    // Fallback: if no known model found, use last word before numbers/specs
    if (!modelName) {
      modelName = nameParts.slice(-1)[0];
    }
  }

  if (modelName) {
    parts.push(modelName);
  }

  // 2. Extract price and currency (e.g., "17790_EUR" or "65000_PLN")
  if (data.price.amount) {
    let priceStr = data.price.amount.replace(/[€$£¥]/g, '').trim();
    let currency = data.price.currency || 'EUR';

    // Detect currency from amount if not already set
    if (data.price.amount.includes('€')) currency = 'EUR';
    else if (data.price.amount.includes('$')) currency = 'USD';
    else if (data.price.amount.includes('£')) currency = 'GBP';
    else if (data.price.amount.includes('¥')) currency = 'JPY';
    else if (data.price.amount.includes('zł') || priceStr.match(/PLN/i)) currency = 'PLN';

    priceStr = priceStr.replace(/[,.\s]/g, '').replace(/PLN/i, ''); // Remove separators and currency text
    if (priceStr) parts.push(`${priceStr}_${currency}`);
  }

  // 3. Extract mileage (e.g., "104000km" from "104,000 km" or "134 000 km")
  if (data.specs.Mileage) {
    let mileage = data.specs.Mileage.replace(/[,.\s]/g, '').replace(/km$/i, '');
    if (mileage) parts.push(`${mileage}km`);
  }

  // 4. Extract car ID from URL
  if (data.url) {
    // mobile.de pattern: ?id=451756414
    let idMatch = data.url.match(/[?&]id=(\d+)/);
    if (idMatch) {
      parts.push(`id_${idMatch[1]}`);
    } else {
      // otomoto.pl pattern: /oferta/name-ID.html
      idMatch = data.url.match(/\/oferta\/.+-(\w+)\.html/);
      if (idMatch) parts.push(`id_${idMatch[1]}`);
    }
  }

  // Join with double underscore and add extension
  let filename = parts.join('__') || 'vehicle-data';
  filename += format === 'json' ? '.json' : '.txt';

  return filename;
}

// Function to download car data
window.downloadCarData = function(format = 'json') {
  const data = window.extractCarData();
  let content, filename, type;

  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
    type = 'application/json';
  } else {
    content = formatDataAsText(data);
    type = 'text/plain';
  }

  filename = generateSmartFilename(data, format);

  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// Helper: Format data as readable text
function formatDataAsText(data) {
  let text = `VEHICLE DATA REPORT\n`;
  text += `Extracted: ${data.extracted}\n`;
  text += `${'='.repeat(60)}\n\n`;

  // Add URL at the beginning
  if (data.url) {
    text += `URL: ${data.url}\n\n`;
  }

  if (data.basics.name) {
    text += `VEHICLE: ${data.basics.name}\n`;
    if (data.basics.subtitle) text += `MODEL: ${data.basics.subtitle}\n`;
    text += `\n`;
  }

  if (Object.keys(data.price).length > 0) {
    text += `PRICE:\n`;
    Object.entries(data.price).forEach(([key, value]) => {
      text += `  ${key}: ${value}\n`;
    });
    text += `\n`;
  }

  if (Object.keys(data.specs).length > 0) {
    text += `SPECIFICATIONS:\n`;
    Object.entries(data.specs).forEach(([key, value]) => {
      text += `  ${key}: ${value}\n`;
    });
    text += `\n`;
  }

  if (data.features.length > 0) {
    text += `FEATURES (${data.features.length}):\n`;
    data.features.forEach(f => text += `  • ${f}\n`);
    text += `\n`;
  }

  if (Object.keys(data.dealer).length > 0) {
    text += `DEALER INFO:\n`;
    Object.entries(data.dealer).forEach(([key, value]) => {
      text += `  ${key}: ${value}\n`;
    });
    text += `\n`;
  }

  // Add description at the end
  if (data.description) {
    text += `${'='.repeat(60)}\n`;
    text += `DESCRIPTION:\n`;
    text += `${'='.repeat(60)}\n`;
    text += `${data.description}\n`;
  }

  return text;
}

// Usage in console:
// extractCarData()        - Auto-detects platform (mobile.de or otomoto.pl) and extracts data
// copyCarDataToClipboard() - Copy as JSON to clipboard
// copyCarDataToClipboard('text') - Copy as formatted text to clipboard
// downloadCarData()       - Download as JSON file
// downloadCarData('text') - Download as TXT file
//
// Supported platforms:
// - mobile.de (Germany)
// - otomoto.pl (Poland)
