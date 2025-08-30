import { log } from '../utils/logger'
import { database } from './database'

/**
 * Handle name-related operations and custom name display
 */
export class NameService {
	/**
	 * Get display name for a user (custom name if available, otherwise Discord name)
	 */
	async getDisplayName(userId: string): Promise<string | null> {
		try {
			const user = await database.client.user.findUnique({
				where: { id: userId },
				select: {
					customName: true,
					displayName: true,
					username: true,
				},
			})

			if (!user) {
				return null
			}

			return user.customName || user.displayName || user.username
		} catch (error) {
			log.error({ error, userId }, 'Failed to get display name')
			return null
		}
	}

	/**
	 * Get multiple display names for users
	 */
	async getDisplayNames(userIds: string[]): Promise<Map<string, string>> {
		const names = new Map<string, string>()

		try {
			const users = await database.client.user.findMany({
				where: { id: { in: userIds } },
				select: {
					id: true,
					customName: true,
					displayName: true,
					username: true,
				},
			})

			for (const user of users) {
				const displayName = user.customName || user.displayName || user.username
				names.set(user.id, displayName)
			}
		} catch (error) {
			log.error({ error, userIds }, 'Failed to get display names')
		}

		return names
	}

	/**
	 * Get name usage statistics
	 */
	async getNameStats(limit = 10) {
		try {
			return await database.client.name.findMany({
				orderBy: { usageCount: 'desc' },
				take: limit,
			})
		} catch (error) {
			log.error({ error }, 'Failed to get name stats')
			return []
		}
	}

	/**
	 * Get rename history for a user
	 */
	async getRenameHistory(userId: string, limit = 10) {
		try {
			return await database.client.$queryRaw`
				SELECT rh.*, u.username, u.display_name 
				FROM rename_history rh
				LEFT JOIN users u ON u.id = rh.renamed_by_user_id
				WHERE rh.target_user_id = ${userId}
				ORDER BY rh.created_at DESC
				LIMIT ${limit}
			`
		} catch (error) {
			log.error({ error, userId }, 'Failed to get rename history')
			return []
		}
	}

	/**
	 * Search for names in the catalog
	 */
	async searchNames(query: string, limit = 10) {
		try {
			return await database.client.name.findMany({
				where: {
					name: {
						contains: query,
						mode: 'insensitive',
					},
				},
				orderBy: { usageCount: 'desc' },
				take: limit,
			})
		} catch (error) {
			log.error({ error, query }, 'Failed to search names')
			return []
		}
	}
}

export const nameService = new NameService()
