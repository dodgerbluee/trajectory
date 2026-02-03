import { ChildAvatar } from '../../features/children';
import type { Child } from '../../types/api';
import layout from '../styles/VisitsLayout.module.css';

interface Props {
  childrenList: Child[];
  selectedChildId?: number | undefined;
  onSelect: (id?: number) => void;
}

export default function ChildSelector({ childrenList, selectedChildId, onSelect }: Props) {
  return (
    <div className={layout.childSelector}>
      <button
        type="button"
        className={`${layout.childRow} ${selectedChildId === undefined ? layout.active : ''}`}
        onClick={() => onSelect(undefined)}
      >
        <div className={layout.childAllAvatars}>
          {childrenList.slice(0, 4).map((c, i) => (
            <ChildAvatar
              key={c.id}
              avatar={c.avatar}
              gender={c.gender}
              alt={c.name}
              className={layout.childAllAvatarItem}
              style={{ marginLeft: i === 0 ? 0 : -18, zIndex: 10 - i }}
            />
          ))}
        </div>
        <div className={layout.childRowBody}>
          <div className={layout.childRowName}>All</div>
        </div>
        <div className={layout.childRowIndicator} aria-hidden />
      </button>

      {childrenList.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`${layout.childRow} ${selectedChildId === c.id ? layout.active : ''}`}
          onClick={() => onSelect(c.id)}
        >
          <ChildAvatar avatar={c.avatar} gender={c.gender} alt={c.name} className={layout.childRowAvatar} />
          <div className={layout.childRowBody}>
            <div className={layout.childRowName}>{c.name}</div>
            <div className={layout.childRowSub}>{new Date(c.date_of_birth).toLocaleDateString()}</div>
          </div>
          <div className={layout.childRowIndicator} aria-hidden />
        </button>
      ))}
    </div>
  );
}
