import { useEffect, useRef, useState } from "react";
import { getCircuit } from "../shared/courses";
import {
  currentChallenges,
  challengeTitle,
  challengeDate,
  challengeGoals,
  challengeLink,
  challengeMedal,
  type ClubChallenge,
} from "../shared/challenges";
import type { State } from "../shared/game";
import type {
  ChallengeHistory,
  ChallengeRecord,
  ChallengeReport,
} from "./challengeRecords";

export function ChallengeHub({
  history,
  incoming,
  onPreview,
  onShare,
}: {
  history: ChallengeHistory;
  incoming: ClubChallenge | null;
  onPreview: (c: ClubChallenge) => void;
  onShare: (c: ClubChallenge) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const current = currentChallenges(now),
    cards =
      incoming && !current.some((c) => c.id === incoming.id)
        ? [incoming, ...current]
        : current;
  return (
    <section className="challenge-hub" aria-label="Retos del club">
      <div className="challenge-heading">
        <div>
          <small>UNA NUEVA LÍNEA PARA VOLVER</small>
          <h2>Retos del club</h2>
        </div>
        <p>
          Individual · Clásico · Marcas personales en este navegador.
          <br />
          Comparte el enlace para jugar el mismo reto con amigos.
        </p>
      </div>
      <div className="challenge-cards">
        {cards.map((c) => {
          const record = history[c.id];
          return (
            <article className={`challenge-card ${c.kind}`} key={c.id}>
              <small>
                {incoming?.id === c.id ? "ENLACE RECIBIDO · " : ""}
                {challengeDate(c)} UTC
              </small>
              <h3>{challengeTitle(c)}</h3>
              <strong>{getCircuit(c.circuit).name}</strong>
              <p>
                {c.holes} hoyos · Par {c.par} · Tres objetivos de habilidad
              </p>
              <div className="challenge-personal">
                {record ? (
                  <>
                    <b>Mejor marca: {record.best} golpes</b>
                    <span>
                      Medalla máxima: {challengeMedal(record.medal)} ·{" "}
                      {record.rounds} vueltas válidas
                    </span>
                  </>
                ) : (
                  <span>Sin marca personal para este reto.</span>
                )}
              </div>
              <div className="challenge-card-actions">
                <button
                  className="primary"
                  aria-label={`Preparar ${challengeTitle(c).toLowerCase()}`}
                  onClick={() => onPreview(c)}
                >
                  Ver y jugar →
                </button>
                <button
                  className="secondary"
                  aria-label={`Compartir ${challengeTitle(c).toLowerCase()}`}
                  onClick={() => onShare(c)}
                >
                  Compartir enlace
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <small className="challenge-calendar">
        Calendario UTC: diario a las 00:00; semanal el lunes. Los enlaces
        conservan su reto y se pueden repetir, sin rachas obligatorias.
      </small>
    </section>
  );
}
export function ChallengeDialog({
  challenge,
  record,
  state,
  onStart,
  startDisabled = false,
  onResume,
  onClose,
  onShare,
}: {
  challenge: ClubChallenge;
  record?: ChallengeRecord;
  state?: State;
  onStart?: () => void;
  startDisabled?: boolean;
  onResume?: () => void;
  onClose: () => void;
  onShare: () => Promise<boolean>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [shareStatus, setShareStatus] = useState("");
  const link = challengeLink(challenge, location.origin, location.pathname);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => {
      if (element.open) element.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="panel challenge-dialog"
      aria-label={onStart ? "Preparar desafío" : "Objetivos del reto"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <button className="close" onClick={onClose} aria-label="Cerrar desafío">
        ×
      </button>
      <div className="eyebrow">
        {challengeDate(challenge)} UTC · {challenge.id}
      </div>
      <h2>{challengeTitle(challenge)}</h2>
      <h3>{getCircuit(challenge.circuit).name}</h3>
      <p>
        {challenge.holes} hoyos · Par {challenge.par} · Un jugador · Clásico
        fijo · Menos golpes. Física original para conservar el mismo desafío y
        sus marcas.
      </p>
      <ul className="challenge-goals">
        {challengeGoals(challenge).map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>
      <p>
        Completar sin alcanzar el límite de golpes da Bronce; cumplir dos
        objetivos da Plata y los tres, Oro. Los objetivos se evalúan al terminar
        toda la vuelta.
      </p>
      {state && (
        <p>
          Hoyo {state.hole + 1}/{challenge.holes} ·{" "}
          {state.players[0].scores.reduce((n, v) => n + v, 0) +
            state.players[0].strokes}{" "}
          golpes actuales.
        </p>
      )}
      {record && (
        <p className="challenge-personal">
          Tu mejor marca: {record.best} golpes · Medalla máxima:{" "}
          {challengeMedal(record.medal)}.
        </p>
      )}
      {onResume && (
        <button className="primary" onClick={onResume}>
          Continuar reto guardado →
        </button>
      )}
      {onStart && (
        <>
          <small>
            Empezar otro intento sustituye el guardado local en curso. Tu
            preferencia de control para otras partidas se conserva.
          </small>
          <button
            className={onResume ? "secondary" : "primary"}
            onClick={onStart}
            disabled={startDisabled}
          >
            {onResume ? "Empezar otro intento" : "Empezar reto individual"} →
          </button>
        </>
      )}
      <label className="field">
        Enlace del reto
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
        />
      </label>
      <button
        className="secondary"
        onClick={async () =>
          setShareStatus(
            (await onShare())
              ? "Enlace copiado."
              : "Selecciona y copia el enlace de arriba.",
          )
        }
      >
        Copiar enlace del reto
      </button>
      {shareStatus && <p role="status">{shareStatus}</p>}
      <button className="text-button" onClick={onClose}>
        {onStart ? "Volver al club" : "Volver al reto"}
      </button>
    </dialog>
  );
}
export function ChallengeSummary({
  challenge,
  report,
  persisted,
  onShare,
  onCopyResult,
}: {
  challenge: ClubChallenge;
  report: ChallengeReport;
  persisted: boolean;
  onShare: () => void;
  onCopyResult: () => void;
}) {
  return (
    <section className="challenge-summary" aria-label="Resultado del desafío">
      <div className="challenge-result-title">
        <div>
          <small>
            {challengeTitle(challenge)} · {challengeDate(challenge)} UTC
          </small>
          <h3>
            {report.eligible
              ? `${challengeMedal(report.medal)} · Reto completado`
              : "Vuelta con límite: sin marca"}
          </h3>
        </div>
        <span
          className={`challenge-medal medal-${report.medal}`}
          aria-label={challengeMedal(report.medal)}
        >
          {report.eligible ? report.medal : "—"}
        </span>
      </div>
      <p>
        {report.score} golpes · Par {report.par} · {report.birdies} hoyos bajo
        par · {report.penalties} penalizaciones.
      </p>
      <ul className="challenge-goals">
        {challengeGoals(challenge).map((g, i) => (
          <li key={g} data-earned={report.goals[i]}>
            <span>{report.goals[i] ? "Logrado" : "Pendiente"}</span>
            {g}
          </li>
        ))}
      </ul>
      {report.eligible ? (
        <p>
          {report.improved
            ? "Nueva marca personal del reto."
            : report.recorded
              ? "Vuelta registrada."
              : "Esta vuelta ya estaba registrada."}{" "}
          Mejor marca: {report.best} golpes.
        </p>
      ) : (
        <p>
          Los hoyos al límite no generan récord ni medalla del reto. Puedes
          repetir la vuelta.
        </p>
      )}
      {!persisted && (
        <small>
          Resultado de esta sesión: el navegador no permitió guardar la marca.
        </small>
      )}
      <div className="challenge-card-actions">
        <button className="secondary" onClick={onShare}>
          Copiar enlace del reto
        </button>
        {report.eligible && (
          <button className="secondary" onClick={onCopyResult}>
            Copiar mi resultado
          </button>
        )}
      </div>
      <small>
        Marca personal local. El enlace comparte el reto; los resultados no se
        publican en una clasificación global.
      </small>
    </section>
  );
}
