import * as XLSX from 'xlsx';

// Export an array of plain objects to an .xlsx file.
// Keys of the first object become column headers.
export function exportToExcel(rows, sheetName, fileName) {
    if (!rows || rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns based on header + content length
    const headers = Object.keys(rows[0]);
    ws['!cols'] = headers.map(h => {
        const maxLen = Math.max(
            h.length,
            ...rows.map(r => String(r[h] ?? '').length)
        );
        return { wch: maxLen + 2 };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
}
