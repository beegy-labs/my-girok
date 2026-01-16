import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Calendar, Plus, GripVertical, ChevronRight } from 'lucide-react';
import { Button } from '@my-girok/ui-components';

/**
 * WorkstationSection - Widget grid for authenticated dashboard
 * V0.0.1 Workstation Style
 */
function WorkstationSectionComponent() {
  const { t } = useTranslation();

  return (
    <section
      className="mb-20"
      aria-label={t('aria.workstationControls', { defaultValue: 'Workstation Controls' })}
    >
      <div className="p-10 md:p-14 rounded-soft bg-theme-bg-secondary border-2 border-theme-border-default shadow-theme-sm">
        {/* Workstation Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12 border-b-2 border-theme-border-default pb-10">
          <div className="flex items-center gap-6">
            <div
              className="p-5 bg-theme-bg-card rounded-input border-2 border-theme-border-default text-theme-primary shadow-theme-sm"
              aria-hidden="true"
            >
              <Layers size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-theme-text-primary">
                {t('home.workstation', { defaultValue: 'Workstation' })}
              </h2>
              <p className="text-[12px] font-bold text-theme-text-secondary uppercase tracking-brand-sm mt-2 font-mono-brand">
                {t('home.activeWorkspace', { defaultValue: 'Active Workspace' })}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="lg"
            rounded="editorial"
            icon={<Plus size={18} strokeWidth={1.5} />}
            aria-label={t('home.addWidget', { defaultValue: 'Add new widget' })}
          >
            {t('home.add', { defaultValue: 'Add' })}
          </Button>
        </div>

        {/* Widget Grid - V0.0.1 Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Today Widget - Active */}
          <article className="bg-theme-bg-card rounded-soft border-2 border-theme-border-default shadow-theme-sm p-10 flex flex-col group hover:border-theme-primary transition-all relative overflow-hidden focus-within:ring-[4px] focus-within:ring-theme-focus-ring">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div
                  className="p-3 bg-theme-bg-secondary rounded-input text-theme-primary border border-theme-border-subtle"
                  aria-hidden="true"
                >
                  <Calendar size={20} />
                </div>
                <h3 className="text-[14px] font-black text-theme-text-primary uppercase tracking-brand-sm font-mono-brand">
                  {t('home.today', { defaultValue: 'Today' })}
                </h3>
              </div>
              <GripVertical
                size={22}
                className="text-theme-border-default group-hover:text-theme-primary cursor-move transition-colors"
                aria-hidden="true"
              />
            </div>

            <div className="space-y-4 flex-1">
              <div className="flex items-start gap-5 p-5 rounded-input bg-theme-bg-secondary border-2 border-transparent group/item hover:bg-theme-bg-card hover:border-theme-border-default transition-all">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-theme-primary" />
                <div>
                  <p className="text-[16px] font-bold text-theme-text-primary leading-tight">
                    {t('home.sampleEvent', { defaultValue: 'Planning Meeting' })}
                  </p>
                  <p className="text-[12px] font-bold text-theme-text-secondary mt-2">
                    10:00 - 11:30
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="mt-10 text-[12px] font-black uppercase tracking-brand-lg text-theme-text-secondary hover:text-theme-primary transition-colors flex items-center gap-3 group/btn min-h-[44px]"
            >
              {t('home.viewAll', { defaultValue: 'View All' })}{' '}
              <ChevronRight
                size={18}
                className="group-hover/btn:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </button>
          </article>

          {/* Empty Widget Slots */}
          {[2, 3].map((slot) => (
            <div
              key={slot}
              className="widget-slot h-[300px] md:h-full min-h-[300px] rounded-soft border-2 border-dashed border-theme-border-default bg-theme-bg-card/40 flex flex-col items-center justify-center group hover:border-theme-primary transition-all cursor-pointer relative overflow-hidden focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring"
              tabIndex={0}
              role="button"
              aria-label={t('aria.addWidgetToSlot', {
                defaultValue: `Add widget to slot ${slot}`,
              })}
            >
              <Plus
                size={32}
                className="text-theme-border-default group-hover:text-theme-primary group-hover:scale-110 transition-all"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="mt-5 text-[11px] font-black uppercase text-theme-text-secondary tracking-brand font-mono-brand">
                {t('home.emptySlot', { defaultValue: 'Empty' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const WorkstationSection = memo(WorkstationSectionComponent);
