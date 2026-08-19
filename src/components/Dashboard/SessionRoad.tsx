import React from 'react';
import { buildSessionRoad, SESSION_ROAD_EXPANDED_NODES } from './dashboardUtils';
import { t } from '../../utils/translations';

interface SessionRoadProps {
  reportCount: number;
  onOpenReports?: () => void;
}

const SessionRoad: React.FC<SessionRoadProps> = ({ reportCount, onOpenReports }) => {
  const { hiddenDone, nodes, nextSession, capacity } = buildSessionRoad(reportCount);
  const compressed = capacity >= SESSION_ROAD_EXPANDED_NODES;
  const nodeSize = compressed ? 'h-[18px] w-[18px] text-[9px]' : 'h-[22px] w-[22px] text-[10px]';
  const reportsLabel =
    reportCount === 1 ? t.sessionReports.reportSingular : t.sessionReports.reportPlural;
  const caption = t.dashboard.sessionRoadCaption
    .replace('{count}', String(reportCount))
    .replace('{reports}', reportsLabel)
    .replace('{next}', String(nextSession));

  const content = (
    <>
      <div className={`flex min-w-0 items-center ${compressed ? 'gap-0.5' : 'gap-1'}`}>
        {hiddenDone > 0 && (
          <span className="shrink-0 pr-0.5 text-[10px] font-semibold text-slate-400">
            +{hiddenDone}
          </span>
        )}
        {nodes.map((node, index) => (
          <React.Fragment key={`${node.state}-${node.session}`}>
            <span
              className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${nodeSize} ${
                node.state === 'done'
                  ? 'bg-brand-600 text-white'
                  : node.state === 'next'
                    ? 'border-[1.5px] border-brand-600 bg-white text-brand-600'
                    : 'border-[1.5px] border-slate-200 bg-white text-slate-400'
              }`}
            >
              {node.session}
            </span>
            {index < nodes.length - 1 && (
              <span
                className={`h-0.5 min-w-[6px] flex-1 ${
                  node.state === 'done' && nodes[index + 1].state === 'done'
                    ? 'bg-brand-600'
                    : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
        <span className="mx-0.5 min-w-[20px] flex-1 border-t-2 border-dashed border-slate-300" />
        <span className="shrink-0 text-xs text-slate-400">…</span>
      </div>
      <p className="mt-1.5 text-xs text-slate-500">{caption}</p>
    </>
  );

  if (!onOpenReports) {
    return <div>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onOpenReports}
      className="w-full rounded-lg text-left transition hover:bg-slate-50"
      aria-label={caption}
    >
      {content}
    </button>
  );
};

export default SessionRoad;
