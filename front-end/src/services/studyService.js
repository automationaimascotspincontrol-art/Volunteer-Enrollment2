/**
 * Study Service
 * Centralized API calls for study participation data
 * Uses assigned_studies collection for accurate volunteer tracking
 */
import api from '../api/api';

/**
 * Get all clinical studies
 */
export const getAllStudies = async () => {
    try {
        const response = await api.get('/prm/studies');
        return response.data;
    } catch (error) {
        console.error('Error fetching studies:', error);
        throw error;
    }
};

/**
 * Get participation data for a specific study
 * @param {string} studyCode - The study code
 * @returns {Promise<Array>} List of participants
 */
export const getStudyParticipation = async (studyCode) => {
    if (!studyCode) return [];

    try {
        const timestamp = new Date().getTime();
        const response = await api.get(
            `/dashboard/clinical/participation?study_code=${studyCode}&_t=${timestamp}`
        );
        console.log(`📊 Participation data for ${studyCode}:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Error fetching participation for ${studyCode}:`, error);
        throw error;
    }
};

/**
 * Get analytics for a specific study
 * @param {string} studyCode - The study code
 * @returns {Promise<Object>} Analytics data
 */
export const getStudyAnalytics = async (studyCode) => {
    if (!studyCode) return null;

    try {
        const timestamp = new Date().getTime();
        const response = await api.get(
            `/dashboard/clinical/analytics?study_code=${studyCode}&_t=${timestamp}`
        );
        console.log(`📈 Analytics for ${studyCode}:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Error fetching analytics for ${studyCode}:`, error);
        throw error;
    }
};

/**
 * Get both participation and analytics data
 * @param {string} studyCode - The study code
 * @returns {Promise<Object>} { participation, analytics }
 */
export const getStudyData = async (studyCode) => {
    if (!studyCode) {
        return { participation: [], analytics: null };
    }

    try {
        const [participation, analytics] = await Promise.all([
            getStudyParticipation(studyCode),
            getStudyAnalytics(studyCode)
        ]);

        return { participation, analytics };
    } catch (error) {
        console.error(`Error fetching study data for ${studyCode}:`, error);
        throw error;
    }
};

/**
 * Download study report
 * @param {string} studyCode - The study code
 */
export const downloadStudyReport = async (studyCode) => {
    if (!studyCode) {
        throw new Error('Study code is required');
    }

    try {
        const response = await api.get(
            `/dashboard/clinical/export?study_code=${studyCode}`,
            { responseType: 'blob' }
        );

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${studyCode}_report.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error(`Error downloading report for ${studyCode}:`, error);
        throw error;
    }
};

/**
 * Get assigned studies with volunteers
 */
export const getAssignedStudies = async (page = 1, limit = 50) => {
    try {
        const response = await api.get(`/prm/assigned-studies?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching assigned studies:', error);
        throw error;
    }
};

/**
 * Delete volunteer assignment
 * @param {string} assignmentId - The assignment ID
 */
export const deleteVolunteerAssignment = async (assignmentId) => {
    if (!assignmentId) {
        throw new Error('Assignment ID is required');
    }

    try {
        const response = await api.delete(`/prm/assigned-studies/${assignmentId}`);
        console.log(`✅ Deleted assignment ${assignmentId}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting assignment ${assignmentId}:`, error);
        throw error;
    }
};

export default {
    getAllStudies,
    getStudyParticipation,
    getStudyAnalytics,
    getStudyData,
    downloadStudyReport,
    getAssignedStudies,
    deleteVolunteerAssignment
};
