import { DomainError } from '../../matches/domain/entities/match'
import { AVATARS, type MatchRepository, type Player, type PlayerRepository } from '../../matches/domain/ports/repositories'
import { normalizeName, validateDisplayName } from '../../matches/domain/rules'
import { computePlayerStats, type PlayerStats } from '../../history/application/history-stats'

export interface Profile extends PlayerStats {
  player: Player
}

export type ProfileUseCases = ReturnType<typeof makeProfileUseCases>

export function makeProfileUseCases({ players, matches }: { players: PlayerRepository; matches: MatchRepository }) {
  async function load(id: string): Promise<Player> {
    const player = await players.findById(id)
    if (!player) throw new DomainError('No encontramos ese perfil.')
    return player
  }

  return {
    async listProfiles(): Promise<Profile[]> {
      const [all, history] = await Promise.all([players.list(), matches.list()])
      return all.map((player) => ({ player, ...computePlayerStats(player.id, history) }))
    },

    async getProfile(id: string): Promise<Profile> {
      const [player, history] = await Promise.all([load(id), matches.list()])
      return { player, ...computePlayerStats(id, history) }
    },

    /** Cambia nombre y avatar. Las partidas viejas conservan el nombre con que se jugaron. */
    async updateProfile(id: string, changes: { displayName: string; avatar: string }): Promise<Player> {
      const player = await load(id)
      const error = validateDisplayName(changes.displayName)
      if (error) throw new DomainError(error)
      const displayName = normalizeName(changes.displayName)
      const clash = await players.findByName(displayName)
      if (clash && clash.id !== id) throw new DomainError(`Ya hay un perfil llamado ${clash.displayName}.`)
      if (!AVATARS.includes(changes.avatar)) throw new DomainError('Elige uno de los avatares de la lista.')
      const next = { ...player, displayName, avatar: changes.avatar }
      await players.update(next)
      return next
    },
  }
}
