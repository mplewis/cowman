import { log } from '../utils/logger'
import { database } from './database'

/**
 * Service for managing name battles and calculating statistics
 */
export class NameBattleService {
	/**
	 * Get name battle statistics for a guild
	 */
	async getNameBattleStats(guildId: string, limit = 10) {
		const { client } = database

		// Get all battles for this guild with vote counts
		const battles = await client.nameBattle.findMany({
			where: { guildId },
			include: {
				nameVotes: true,
			},
			orderBy: { createdAt: 'desc' },
		})

		// Calculate win percentages for each name
		const nameStats = new Map<string, { battles: number; wins: number; totalVotes: number }>()

		for (const battle of battles) {
			const votesA = battle.nameVotes.filter(vote => vote.choice === 'a').length
			const votesB = battle.nameVotes.filter(vote => vote.choice === 'b').length
			const totalVotes = votesA + votesB

			if (totalVotes === 0) continue

			// Initialize stats for both names if they don't exist
			if (!nameStats.has(battle.nameA)) {
				nameStats.set(battle.nameA, { battles: 0, wins: 0, totalVotes: 0 })
			}
			if (!nameStats.has(battle.nameB)) {
				nameStats.set(battle.nameB, { battles: 0, wins: 0, totalVotes: 0 })
			}

			const statsA = nameStats.get(battle.nameA)
			const statsB = nameStats.get(battle.nameB)

			if (!statsA || !statsB) {
				continue
			}

			// Update battle counts and vote totals
			statsA.battles++
			statsB.battles++
			statsA.totalVotes += totalVotes
			statsB.totalVotes += totalVotes

			// Determine winner and update win counts
			if (votesA > votesB) {
				statsA.wins++
			} else if (votesB > votesA) {
				statsB.wins++
			}
			// Ties don't count as wins for either side
		}

		// Convert to array and calculate win percentages
		const results = Array.from(nameStats.entries())
			.map(([name, stats]) => ({
				name,
				battles: stats.battles,
				wins: stats.wins,
				totalVotes: stats.totalVotes,
				winPercentage: stats.battles > 0 ? (stats.wins / stats.battles) * 100 : 0,
			}))
			.filter(result => result.battles > 0)
			.sort((a, b) => {
				// Sort by win percentage descending, then by total battles descending
				if (b.winPercentage !== a.winPercentage) {
					return b.winPercentage - a.winPercentage
				}
				return b.battles - a.battles
			})
			.slice(0, limit)

		log.debug({ guildId, resultsCount: results.length }, 'Retrieved name battle stats')

		return results
	}

	/**
	 * Get detailed battle history with links to original rename messages
	 */
	async getBattleHistoryWithRenameLinks(guildId: string, limit = 20) {
		const { client } = database

		// Get battles with vote counts
		const battles = await client.nameBattle.findMany({
			where: { guildId },
			include: {
				nameVotes: true,
			},
			orderBy: { createdAt: 'desc' },
			take: limit,
		})

		const results = []

		for (const battle of battles) {
			const votesA = battle.nameVotes.filter(vote => vote.choice === 'a').length
			const votesB = battle.nameVotes.filter(vote => vote.choice === 'b').length
			const totalVotes = votesA + votesB

			// Find rename history entries for both names
			const renameHistoryA = await client.renameHistory.findFirst({
				where: {
					guildId,
					name: {
						name: battle.nameA,
					},
				},
				include: {
					name: true,
					targetUser: true,
					renamedBy: true,
				},
				orderBy: { createdAt: 'asc' },
			})

			const renameHistoryB = await client.renameHistory.findFirst({
				where: {
					guildId,
					name: {
						name: battle.nameB,
					},
				},
				include: {
					name: true,
					targetUser: true,
					renamedBy: true,
				},
				orderBy: { createdAt: 'asc' },
			})

			let winner: string | null = null
			if (votesA > votesB) {
				winner = battle.nameA
			} else if (votesB > votesA) {
				winner = battle.nameB
			}

			results.push({
				battleId: battle.id,
				nameA: battle.nameA,
				nameB: battle.nameB,
				votesA,
				votesB,
				totalVotes,
				winner,
				battleMessageId: battle.messageId,
				createdAt: battle.createdAt,
				renameMessageA: renameHistoryA
					? {
							messageId: renameHistoryA.messageId,
							channelId: renameHistoryA.channelId,
							targetUser: renameHistoryA.targetUser.username,
							renamedBy: renameHistoryA.renamedBy.username,
							createdAt: renameHistoryA.createdAt,
						}
					: null,
				renameMessageB: renameHistoryB
					? {
							messageId: renameHistoryB.messageId,
							channelId: renameHistoryB.channelId,
							targetUser: renameHistoryB.targetUser.username,
							renamedBy: renameHistoryB.renamedBy.username,
							createdAt: renameHistoryB.createdAt,
						}
					: null,
			})
		}

		log.debug(
			{ guildId, battleCount: results.length },
			'Retrieved battle history with rename links'
		)

		return results
	}

	/**
	 * End an active name battle
	 */
	async endBattle(battleId: string) {
		const { client } = database

		const battle = await client.nameBattle.update({
			where: { id: battleId },
			data: { active: false },
			include: {
				nameVotes: true,
			},
		})

		const votesA = battle.nameVotes.filter(vote => vote.choice === 'a').length
		const votesB = battle.nameVotes.filter(vote => vote.choice === 'b').length

		log.info(
			{
				battleId,
				nameA: battle.nameA,
				nameB: battle.nameB,
				votesA,
				votesB,
			},
			'Name battle ended'
		)

		return {
			battle,
			votesA,
			votesB,
			winner: votesA > votesB ? battle.nameA : votesB > votesA ? battle.nameB : null,
		}
	}
}

export const nameBattleService = new NameBattleService()
