/**
 * Data export utilities for admin panel
 * Supports CSV and JSON export formats
 */

export type ExportFormat = 'csv' | 'json'

export interface ExportOptions {
  filename?: string
  format?: ExportFormat
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  const filename = options.filename || 'export'
  const headers = Object.keys(data[0])
  
  // CSV header
  const csvHeader = headers.map(h => `"${h}"`).join(',')
  
  // CSV rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header]
      // Handle null, undefined, objects, arrays
      if (value === null || value === undefined) {
        return '""'
      }
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      }
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`
    }).join(',')
  })
  
  const csvContent = [csvHeader, ...csvRows].join('\n')
  
  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Export data to JSON format
 */
export function exportToJSON<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  const filename = options.filename || 'export'
  const jsonContent = JSON.stringify(data, null, 2)
  
  // Create blob and download
  const blob = new Blob([jsonContent], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.json`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Export data (auto-detect format from options)
 */
export function exportData<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): void {
  const format = options.format || 'csv'
  
  if (format === 'csv') {
    exportToCSV(data, options)
  } else if (format === 'json') {
    exportToJSON(data, options)
  } else {
    throw new Error(`Unsupported export format: ${format}`)
  }
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Flatten nested objects for CSV export
 */
export function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {}
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      const value = obj[key]
      
      if (value === null || value === undefined) {
        flattened[newKey] = ''
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Recursively flatten nested objects
        Object.assign(flattened, flattenObject(value, newKey))
      } else if (Array.isArray(value)) {
        // Convert array to comma-separated string
        flattened[newKey] = value.map(v => 
          typeof v === 'object' ? JSON.stringify(v) : String(v)
        ).join('; ')
      } else if (value instanceof Date) {
        flattened[newKey] = formatDateForExport(value)
      } else {
        flattened[newKey] = value
      }
    }
  }
  
  return flattened
}


