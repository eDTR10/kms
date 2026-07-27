// @ts-nocheck
import api from './api';

// Parse CSV text into array of objects
export function parseCsvText(text) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Parse headers
  const headers = parseCsvLine(lines[0]);
  
  // Parse rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      data.push(row);
    }
  }
  
  return data;
}

// Parse a single CSV line handling quoted fields
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

// Convert CSV row to site payload
export function csvRowToSitePayload(row) {
  // Parse coordinates (lat, lon)
  let latitude = null;
  let longitude = null;
  
  if (row.Coordinates) {
    const coords = row.Coordinates.split(',').map(c => parseFloat(c.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      latitude = coords[0];
      longitude = coords[1];
    }
  }
  
  // Parse AP field
  const apValue = (row.AP || '').toLowerCase();
  const isAp = apValue === 'true' || apValue === 'yes' || apValue === '1';
  
  return {
    site_code: row['Site Code'] || '',
    r10_site_id: row['R10 Site ID'] || '',
    site_name: row['Site Name'] || '',
    site_type: row['Site Type'] || '',
    province: row.Province || '',
    district: row.District || '',
    locality: row.Locality || '',
    barangay: row.Barangay || '',
    site_status: row['Site Status'] || 'Live',
    contract: row.Contract || '',
    supplier: row.Supplier || '',
    is_ap: isAp,
    latitude,
    longitude,
    psgc: row.PSGC || '',
    gida: row.GIDA || '',
  };
}

// Send a batch of sites to the backend
export async function importBatch(batch) {
  const { data } = await api.post('kms/free-wifi-sites/import-json/', batch);
  return data;
}

// Import CSV in batches with progress callback
export async function importCsvInBatches(csvText, batchSize = 100, onProgress) {
  const rows = parseCsvText(csvText);
  const totalRows = rows.length;
  let processed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  const allErrors = [];
  
  // Process in batches
  for (let i = 0; i < totalRows; i += batchSize) {
    const batchRows = rows.slice(i, i + batchSize);
    const batch = batchRows.map(csvRowToSitePayload).filter(p => p.r10_site_id);
    
    try {
      const result = await importBatch(batch);
      totalCreated += result.created || 0;
      totalUpdated += result.updated || 0;
      totalErrors += (result.errors || []).length;
      if (result.errors) {
        allErrors.push(...result.errors);
      }
    } catch (err) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, err);
      totalErrors += batch.length;
    }
    
    processed += batchRows.length;
    if (onProgress) {
      onProgress({
        processed,
        total: totalRows,
        percent: Math.round((processed / totalRows) * 100),
        created: totalCreated,
        updated: totalUpdated,
        errors: totalErrors,
      });
    }
  }
  
  return {
    created: totalCreated,
    updated: totalUpdated,
    errors: totalErrors,
    errorDetails: allErrors.slice(0, 10), // First 10 errors
    message: `Created ${totalCreated}, updated ${totalUpdated}, ${totalErrors} errors.`,
  };
}
