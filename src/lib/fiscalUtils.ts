const monthMap: Record<string, number> = {
    'January': 0,
    'February': 1,
    'March': 2,
    'April': 3,
    'May': 4,
    'June': 5,
    'July': 6,
    'August': 7,
    'September': 8,
    'October': 9,
    'November': 10,
    'December': 11
};

/**
 * Returns the current Fiscal Year based on a starting month.
 * If current calendar month >= startMonth, it is the current calendar year.
 * Otherwise, it is the previous calendar year.
 */
export function getFiscalYear(date: Date, fiscalYearStartStr: string = 'January'): number {
    const startMonth = monthMap[fiscalYearStartStr] || 0;
    const currentMonth = date.getMonth();
    return currentMonth >= startMonth ? date.getFullYear() : date.getFullYear() - 1;
}
