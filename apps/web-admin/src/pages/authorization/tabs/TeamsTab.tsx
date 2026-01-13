import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2, Users, Trash2, Edit } from 'lucide-react';
import { teamsApi, type Team } from '../../../api/teams';
import { Card } from '../../../components/atoms/Card';
import { useApiError } from '../../../hooks/useApiError';
import { useApiMutation } from '../../../hooks/useApiMutation';

export default function TeamsTab() {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const { executeWithErrorHandling } = useApiError({
    context: 'TeamsTab.fetchTeams',
  });

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    const response = await executeWithErrorHandling(() => teamsApi.listTeams({ limit: 100 }));
    if (response) {
      setTeams(response.data);
    }
    setLoading(false);
  }, [executeWithErrorHandling]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const { mutate: deleteTeam } = useApiMutation({
    mutationFn: (id: string) => teamsApi.deleteTeam(id),
    context: 'TeamsTab.deleteTeam',
    successToast: t('authorization.teamDeletedSuccess', 'Team deleted successfully'),
    onSuccess: () => {
      fetchTeams();
    },
  });

  const handleDelete = (id: string) => {
    if (
      !confirm(t('authorization.confirmDeleteTeam', 'Are you sure you want to delete this team?'))
    ) {
      return;
    }

    deleteTeam(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-theme-text-primary">
          {t('authorization.teams', 'Teams')} ({teams.length})
        </h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" />
          {t('authorization.createTeam', 'Create Team')}
        </button>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-theme-text-tertiary">
            {t('authorization.noTeams', 'No teams found')}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card key={team.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-theme-bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-theme-text-tertiary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-theme-text-primary truncate">{team.name}</h3>
                  {team.description && (
                    <p className="text-xs text-theme-text-tertiary line-clamp-2">
                      {team.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-theme-text-secondary">
                    {t('authorization.members', 'Members')}
                  </span>
                  <span className="font-medium text-theme-text-primary">{team.members.length}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-theme-border-default">
                <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors">
                  <Edit className="w-4 h-4" />
                  {t('common.edit', 'Edit')}
                </button>
                <button
                  onClick={() => handleDelete(team.id)}
                  className="px-3 py-2 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
