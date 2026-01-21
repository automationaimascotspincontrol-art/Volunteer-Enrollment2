
/**
 * Abbreviate study code for compact display
 * Example: "XXX-7102-LL-SR25" -> "XXX-7102"
 */
function abbreviateStudyCode(fullCode) {
    if (!fullCode) return '';
    const parts = fullCode.split('-');
    // Take first two parts for most study codes
    return parts.length > 2 ? parts.slice(0, 2).join('-') : fullCode;
}

/**
 * Get color based on visit type/label for better visual organization
 */
function getVisitColor(visitLabel, originalColor, status) {
    const label = visitLabel?.toLowerCase() || '';

    // DRT/Washout - Always Red
    if (label.includes('drt') || label.includes('washout')) {
        return '#ef4444'; // Red
    }

    // Baseline/T0 - Blue (Primary visits)
    if (label.includes('baseline') || label === 't0' || label.includes('t0')) {
        return '#3b82f6'; // Blue
    }

    // Screening - Purple
    if (label.includes('screening') || label.includes('screen')) {
        return '#8b5cf6'; // Purple
    }

    // Follow-up visits (T1, T2, T3, etc.) - Lighter Blue/Cyan
    if (label.match(/t\d+/) || label.includes('follow')) {
        return '#06b6d4'; // Cyan
    }

    // Completed visits - Green
    if (status === 'COMPLETED' || status === 'completed') {
        return '#10b981'; // Green
    }

    // Default: Use original color or gray for ongoing
    return originalColor || '#6b7280'; // Gray
}

export function visitsToCalendarEvents(studyInstance, visits) {
    const abbreviatedCode = abbreviateStudyCode(studyInstance.studyInstanceCode || studyInstance.studyName);

    return visits.map((visit, index) => {
        const color = getVisitColor(visit.visitLabel, visit.color, visit.status);

        return {
            id: `${studyInstance.studyInstanceCode}-${index}`,
            title: `${abbreviatedCode} • ${visit.visitLabel}`,
            start: visit.plannedDate,
            end: visit.plannedDate,
            allDay: true,
            backgroundColor: color,
            borderColor: color,
            extendedProps: {
                studyInstanceId: studyInstance._id,
                studyCode: studyInstance.studyInstanceCode,
                visitLabel: visit.visitLabel,
                volunteers: studyInstance.volunteersPlanned,
                status: visit.status
            }
        };
    });
}
