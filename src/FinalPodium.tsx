import type { CSSProperties } from "react";
import type { State } from "../shared/game";
import { total } from "../shared/game";
import { colors } from "../shared/courses";
import {
  matchRanking,
  matchPosition,
  confirmedPoints,
  pointsMatch,
} from "../shared/competition";
import { roundHighlights } from "../shared/highlights";
export function FinalPodium({ state }: { state: State }) {
  if (state.phase !== "finished" || state.practice || state.players.length < 2)
    return null;
  const podium = matchRanking(state)
      .filter((p) => !p.withdrawn)
      .slice(0, 3),
    highlights = roundHighlights(state);
  if (!podium.length) return null;
  return (
    <section className="final-podium" aria-label="Podio del club">
      <div className="podium-cup" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <path d="M20 9h24v15c0 11-5 17-12 17s-12-6-12-17V9Z M20 14H9v8c0 8 5 12 14 12 M44 14h11v8c0 8-5 12-14 12 M32 41v12 M21 55h22" />
        </svg>
      </div>
      <div className="eyebrow">EL PODIO DEL CLUB</div>
      <div className="podium-places">
        {podium.map((player) => {
          const place = matchPosition(player, state);
          return (
            <div
              key={player.id}
              className={`podium-place place-${place}`}
              style={
                {
                  "--ball-color": colors[state.players.indexOf(player)],
                } as CSSProperties
              }
            >
              <span className="podium-ball" />
              <small>PUESTO {place}</small>
              <strong title={player.name}>{player.name}</strong>
              <b>
                {pointsMatch(state)
                  ? `${confirmedPoints(player, state)} pt`
                  : `${total(player)} ${total(player) === 1 ? "golpe" : "golpes"}`}
              </b>
            </div>
          );
        })}
      </div>
      {highlights.length > 0 && (
        <div className="round-highlights" aria-label="Momentos de la vuelta">
          {highlights.map((highlight) => (
            <div key={highlight.id}>
              <small>{highlight.title}</small>
              <strong>{highlight.players.join(" · ")}</strong>
              <span>{highlight.detail}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
