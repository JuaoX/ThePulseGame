import React, { useState } from 'react';
import { CHARACTERS, Character, characterById } from '../data/characters';
import { PlayerProfile } from '../types/game';
import { Icon } from './Icon';

export function CharacterPortrait({ character, animated = false, size = 'normal' }: { character: Character; animated?: boolean; size?: 'small' | 'normal' | 'large' }) {
  return <span className={`character-portrait portrait-${size} effect-${character.effect} ${animated ? 'is-animated' : ''}`} style={{ '--character-color': character.color } as React.CSSProperties}><img src={`${import.meta.env.BASE_URL}avatars/${character.asset}.svg`} alt="" width="100" height="100" decoding="async"/><span className="portrait-orbit" aria-hidden="true"/></span>;
}

export function CharacterCollection({ profile, onAcquire, onEquip }: { profile: PlayerProfile; onAcquire: (id: string) => void; onEquip: (id: string) => void }) {
  const [selectedId, setSelectedId] = useState(profile.equippedCharacter);
  const selected = characterById(selectedId);
  const owned = profile.ownedCharacters.includes(selected.id);
  const equipped = profile.equippedCharacter === selected.id;
  const [notice, setNotice] = useState('');
  return <section className="character-collection">
    <div className="collection-heading"><h1>Sua coleção</h1><span className="fragment-balance"><Icon name="fragment" size={20}/><strong>{profile.fragments}</strong><span>fragmentos</span></span></div>
    <div className="character-showcase" style={{ '--character-color': selected.color } as React.CSSProperties}>
      <CharacterPortrait character={selected} animated size="large"/>
      <div className="character-description"><h2>{selected.name}</h2><p className="character-affinity">{selected.affinity}</p><p>{selected.description}</p><p className="meta">Mesmas regras, tempo e pontuação para todos.</p>
        {equipped ? <button className="secondary" disabled><Icon name="check" size={18}/>Em uso</button> : owned ? <button className="primary" onClick={() => { onEquip(selected.id); setNotice(`${selected.name} está com você.`); }}>Usar personagem</button> : <><button className="primary" disabled={profile.fragments < selected.cost} onClick={() => { onAcquire(selected.id); setNotice(`${selected.name} entrou na sua coleção.`); }}>Adquirir e usar <Icon name="fragment" size={18}/>{selected.cost}</button>{profile.fragments < selected.cost && <span className="meta">Faltam {selected.cost - profile.fragments} fragmentos.</span>}</>}
      </div>
    </div>
    <div className="collection-notice" role="status">{notice}</div>
    <div className="character-grid">{CHARACTERS.map(character => <button className={`character-card ${selectedId === character.id ? 'selected' : ''}`} key={character.id} aria-pressed={selectedId === character.id} onClick={() => { setSelectedId(character.id); setNotice(''); }} aria-label={`Ver ${character.name}`}><CharacterPortrait character={character}/><strong>{character.name}</strong><span>{profile.equippedCharacter === character.id ? 'Em uso' : profile.ownedCharacters.includes(character.id) ? 'Na coleção' : <><Icon name="fragment" size={13}/>{character.cost}</>}</span>{character.cost >= 64 && <span className="animated-tag">Efeito vivo</span>}</button>)}</div>
    <details className="disclosure"><summary>Como conseguir fragmentos?</summary><p>Descubra sinais em Ecos, complete edições das Cruzadas e conclua uma rodada com acertos nas outras experiências. Cada sinal e edição rende uma vez; nas rodadas, vale o primeiro bom resultado de cada experiência por dia. Repetir não rende novos fragmentos. Sem compras com dinheiro ou sorteios.</p><p>Kael e Luna estão liberados desde o início. Quem já usava a versão anterior mantém os seis personagens destes estilos.</p></details>
  </section>;
}
