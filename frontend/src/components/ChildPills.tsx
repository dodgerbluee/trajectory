import { childrenApi } from '../lib/api-client';
import type { Child } from '../types/api';
import { useMemo } from 'react';

interface Props {
  childrenList: Child[];
  selectedChildId?: number | undefined;
  onSelect: (id?: number) => void;
}

function ChildPills({ childrenList, selectedChildId, onSelect }: Props) {
  const options = useMemo(() => childrenList, [childrenList]);

  return (
    <div className="child-pills">
      <div className="pills-list">
        <button
          type="button"
          className={`pill ${selectedChildId === undefined ? 'active' : ''}`}
          onClick={() => onSelect(undefined)}
          title="All Children"
        >
          <div className="all-avatars">
            {childrenList.slice(0, 4).map((c, i) => {
              const avatarUrl = c.avatar ? childrenApi.getAvatarUrl(c.avatar) : childrenApi.getDefaultAvatarUrl(c.gender);
              return (
                <img
                  key={c.id}
                  src={avatarUrl}
                  alt={c.name}
                  className="all-avatar-item"
                  style={{ marginLeft: i === 0 ? 0 : -25, zIndex: 10 - i }}
                />
              );
            })}
          </div>
          <span className="pill-label">All</span>
        </button>

        {options.map((c) => {
          const avatarUrl = c.avatar ? childrenApi.getAvatarUrl(c.avatar) : childrenApi.getDefaultAvatarUrl(c.gender);
          return (
            <button
              key={c.id}
              type="button"
              className={`pill ${selectedChildId === c.id ? 'active' : ''}`}
              onClick={() => onSelect(c.id)}
              title={c.name}
            >
              <img src={avatarUrl} alt={c.name} className="pill-avatar" />
              <span className="pill-label">{c.name}</span>
            </button>
          );
        })}
      </div>

      <div className="child-combobox">
        {/* <input list="children-list" placeholder="Search child..." className="combobox-input" onChange={(e) => {
          const val = e.target.value;
          const found = options.find(o => o.name === val);
          if (found) onSelect(found.id);
        }} /> */}
        <datalist id="children-list">
          {options.map(c => <option key={c.id} value={c.name} />)}
        </datalist>
      </div>
    </div>
  );
}

export default ChildPills;
