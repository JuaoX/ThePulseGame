import React, { useEffect, useRef, useState } from 'react';
import { ECHO_LEVELS, EchoState, echoSolved, echoStep } from '../engine/echo';
import { SoundEngine } from '../engine/sound';
import { Icon } from './Icon';

export function EchoExperience({ onComplete, discoveries }: { onComplete: (key: string, amount: number) => void; discoveries: string[] }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = ECHO_LEVELS[levelIndex];
  const [history, setHistory] = useState<EchoState[]>([{ values: level.start, pending: null, moves: 0 }]);
  const state = history[history.length - 1];
  const solved = echoSolved(state, level.target);
  const finished = solved || state.moves >= level.limit;
  const reported = useRef('');
  function reset(index = levelIndex) { const next = ECHO_LEVELS[index]; setLevelIndex(index); setHistory([{ values: next.start, pending: null, moves: 0 }]); reported.current = ''; }
  useEffect(() => {
    if (!solved || reported.current === level.id) return;
    reported.current = level.id; onComplete(level.id, 8); SoundEngine.finish();
  }, [solved, level.id, onComplete]);
  return <section className="echo-experience">
    <div className="experience-toolbar"><label htmlFor="echo-level">Sinal</label><select id="echo-level" aria-label="Sinal" value={levelIndex} onChange={event => reset(Number(event.target.value))}>{ECHO_LEVELS.map((item, index) => <option key={item.id} value={index}>{index + 1}{discoveries.includes(item.id) ? ' · descoberto' : ''}</option>)}</select><span>{state.moves}/{level.limit} toques</span></div>
    <p className="echo-goal">Faça os sinais chegarem aos números do molde.</p>
    <div className="echo-signals">{state.values.map((value, index) => <button className={`echo-signal ${value === level.target[index] ? 'aligned' : ''} ${state.pending !== null && (state.pending + 1) % 3 === index ? 'receives-echo' : ''}`} key={index} disabled={finished} aria-label={`Sinal ${'ABC'[index]}: ${value}, molde ${level.target[index]}`} onClick={() => { setHistory(previous => [...previous, echoStep(previous[previous.length - 1], index)]); SoundEngine.modeSelect(); }}><span className="echo-letter">{'ABC'[index]}</span><strong>{value}</strong><span className="echo-bars" aria-hidden="true">{[0, 1, 2].map(bar => <i key={bar} className={bar < value ? 'filled' : ''}/>)}</span><span>molde {level.target[index]}</span></button>)}</div>
    <p className="echo-pending" role="status">{solved ? 'Em sintonia!' : finished ? 'O eco se perdeu. Tente outra ordem.' : state.pending === null ? 'Um toque agora. Um eco no próximo.' : <>No próximo toque: +1 em <strong>{'ABC'[(state.pending + 1) % 3]}</strong><Icon name="arrow" size={18}/></>}</p>
    <div className="experience-actions"><button className="secondary" disabled={history.length < 2} onClick={() => setHistory(previous => previous.slice(0, -1))}>Desfazer</button><button className="secondary" onClick={() => reset()}>Recomeçar</button>{solved && levelIndex < ECHO_LEVELS.length - 1 && <button className="primary" onClick={() => reset(levelIndex + 1)}>Próximo sinal <Icon name="arrow" size={18}/></button>}</div>
    <details className="disclosure"><summary>Como funciona o eco?</summary><p>O toque soma 1 no sinal escolhido. No toque seguinte, ele também soma 1 no vizinho à direita: A → B → C → A. Depois do 3, volta ao 0. A ordem muda tudo.</p></details>
  </section>;
}
