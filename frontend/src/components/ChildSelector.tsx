import ChildAvatar from './ChildAvatar';
import type { Child } from '../types/api';

interface Props {
  childrenList: Child[];
  selectedChildId?: number | undefined;
  onSelect: (id?: number) => void;
}

export default function ChildSelector({ childrenList, selectedChildId, onSelect }: Props) {
  return (
    <div className="child-selector">
      <button
        type="button"
        className={`child-row ${selectedChildId === undefined ? 'active' : ''}`}
        onClick={() => onSelect(undefined)}
      >
        <div className="child-all-avatars">
          {childrenList.slice(0, 4).map((c, i) => (
            <ChildAvatar
              key={c.id}
              avatar={c.avatar}
              gender={c.gender}
              alt={c.name}
              className="child-all-avatar-item"
              style={{ marginLeft: i === 0 ? 0 : -18, zIndex: 10 - i }}
            />
          ))}
        </div>
        <div className="child-row-body">
          <div className="child-row-name">All</div>
        </div>
        <div className="child-row-indicator" aria-hidden />
      </button>

      {childrenList.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`child-row ${selectedChildId === c.id ? 'active' : ''}`}
          onClick={() => onSelect(c.id)}
        >
          <ChildAvatar avatar={c.avatar} gender={c.gender} alt={c.name} className="child-row-avatar" />
          <div className="child-row-body">
            <div className="child-row-name">{c.name}</div>
            <div className="child-row-sub">{new Date(c.date_of_birth).toLocaleDateString()}</div>
          </div>
          <div className="child-row-indicator" aria-hidden />
        </button>
      ))}
    </div>
  );
}
