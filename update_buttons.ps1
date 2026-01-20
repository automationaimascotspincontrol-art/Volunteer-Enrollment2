# Read file
$content = Get-Content "front-end\src\pages\recruiter\RecentEnrollment.jsx" -Raw

# Pattern to replace: Single Approve button -> Approve + Reject buttons
$oldPattern = @'
                    \) : isScreening \? \(
                        <button
                            onClick=\{async \(\) => \{
                                try \{
                                    await api\.post\(`/enrollment/approve/\$\{volunteer\.volunteer_id\}`\);
                                    onClose\(\);
                                    window\.location\.reload\(\); // Refresh to show updated status
                                \} catch \(err\) \{
                                    alert\(err\.response\?\.data\?\.detail \|\| 'Failed to approve volunteer'\);
                                \}
                            \}\}
                            style=\{\{
                                width: '100%',
                                padding: '1rem',
                                background: 'linear-gradient\(90deg, #10b981, #059669\)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0\.5rem',
                                boxShadow: '0 4px 15px rgba\(16, 185, 129, 0\.3\)',
                                transition: 'all 0\.2s'
                            \}\}
                        >
                            Approve Volunteer
                            <UserCheck size=\{20\} />
                        </button>
                    \) :
'@

$newContent = @'
                    ) : isScreening ? (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={async () => {
                                    try {
                                        await api.post(`/enrollment/approve/${volunteer.volunteer_id}`);
                                        onClose();
                                        window.location.reload();
                                    } catch (err) {
                                        alert(err.response?.data?.detail || 'Failed to approve volunteer');
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    background: 'linear-gradient(90deg, #10b981, #059669)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Approve
                                <UserCheck size={20} />
                            </button>
                            <button
                                onClick={async () => {
                                    if (!confirm('Are you sure you want to reject this volunteer?')) return;
                                    try {
                                        await api.post(`/enrollment/reject/${volunteer.volunteer_id}`);
                                        onClose();
                                        window.location.reload();
                                    } catch (err) {
                                        alert(err.response?.data?.detail || 'Failed to reject volunteer');
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Reject
                                <X size={20} />
                            </button>
                        </div>
                    ) :
'@

# First replacement: Add Reject button
$content = $content -replace $oldPattern, $newContent

# Now add Move Back button for approved
$oldPattern2 = @'
                            \{\!showStudySelection \? \(
                                <button
                                    onClick=\{\(\) => \{
                                        setShowStudySelection\(true\);
                                        fetchOngoingStudies\(\);
                                    \}\}
                                    style=\{\{
                                        width: '100%',
'@

$newContent2 = @'
                            {!showStudySelection ? (
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        onClick={() => {
                                            setShowStudySelection(true);
                                            fetchOngoingStudies();
                                        }}
                                        style={{
                                            flex: 1,
'@

$content = $content -replace $oldPattern2, $newContent2

# Add Move Back button at end
$content = $content -replace "Assign to Study`r`n                                        <ArrowRight size=\{20\} />`r`n                                    </button>`r`n                                \) :", "Assign to Study`r`n                                        <ArrowRight size={20} />`r`n                                    </button>`r`n                                    <button`r`n                                        onClick={async () => {`r`n                                            if (!confirm('Move this volunteer back to pre-screening?')) return;`r`n                                            try {`r`n                                                await api.post``/enrollment/move-back/``{volunteer.volunteer_id}``);`r`n                                                onClose();`r`n                                                window.location.reload();`r`n                                            } catch (err) {`r`n                                                alert(err.response?.data?.detail || 'Failed to move volunteer back');`r`n                                            }`r`n                                        }}`r`n                                        style={{`r`n                                            padding: '1rem',`r`n                                            background: 'white',`r`n                                            color: '#f59e0b',`r`n                                            border: '2px solid #f59e0b',`r`n                                            borderRadius: '12px',`r`n                                            fontSize: '0.9rem',`r`n                                            fontWeight: '700',`r`n                                            cursor: 'pointer',`r`n                                            display: 'flex',`r`n                                            alignItems: 'center',`r`n                                            justifyContent: 'center',`r`n                                            gap: '0.5rem',`r`n                                            transition: 'all 0.2s'`r`n                                        }}`r`n                                    >`r`n                                        Move Back`r`n                                    </button>`r`n                                </div>`r`n                            ) :"

# Save
$content | Set-Content "front-end\src\pages\recruiter\RecentEnrollment.jsx" -NoNewline

Write-Host "Replacement complete!"
