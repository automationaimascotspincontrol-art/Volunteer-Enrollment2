
export function visitsToCalendarEvents(studyInstance, visits) {
    return visits.map((visit, index) => ({
        id: `${studyInstance.studyInstanceCode}-${index}`,
        title: `${studyInstance.studyName} — ${visit.visitLabel}`,
        start: visit.plannedDate,
        end: visit.plannedDate,
        allDay: true,
        backgroundColor: visit.color,
        borderColor: visit.color,
        extendedProps: {
            studyInstanceId: studyInstance._id,
            visitLabel: visit.visitLabel,
            volunteers: studyInstance.volunteersPlanned,
            status: visit.status
        }
    }));
}
