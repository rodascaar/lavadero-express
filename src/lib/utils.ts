export function parseWorkingDays(daysString: string | number[] | null | undefined): number[] {
    if (!daysString) return [1, 2, 3, 4, 5, 6];

    if (Array.isArray(daysString)) return daysString;

    try {
        return daysString
            .replace(/[\[\]]/g, '')
            .split(',')
            .map(d => parseInt(d.trim()))
            .filter(d => !isNaN(d));
    } catch (e) {
        return [1, 2, 3, 4, 5, 6];
    }
}
