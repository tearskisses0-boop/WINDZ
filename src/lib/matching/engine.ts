import { Post } from '../../types';

export interface MatchResult {
  post: Post;
  score: number; // 0 to 100
  reasons: string[];
}

// Arabic and French token normalizer for search & deterministic matching
export function normalizeTokens(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    // Remove Arabic diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Arabic alefs
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    // Remove punctuation
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}

/**
 * Deterministic matching engine (No paid AI, zero false claims)
 * Links NEED requests to OFFER listings and vice-versa
 */
export function findMatchesForPost(targetPost: Post, allPosts: Post[]): MatchResult[] {
  const targetType = targetPost.post_type === 'NEED' ? 'OFFER' : 'NEED';
  const targetTokens = new Set([
    ...normalizeTokens(targetPost.title),
    ...normalizeTokens(targetPost.description),
  ]);

  const results: MatchResult[] = [];

  for (const candidate of allPosts) {
    // Only compare opposing post types
    if (candidate.post_type !== targetType) continue;
    // Skip same post or same user
    if (candidate.id === targetPost.id) continue;
    if (candidate.user_id === targetPost.user_id) continue;
    // Skip unavailable or expired posts
    if (candidate.availability_status !== 'available') continue;

    let score = 0;
    const reasons: string[] = [];

    // 1. Category Match (40 pts)
    if (candidate.category_id === targetPost.category_id) {
      score += 40;
      reasons.push('Same category');

      // Subcategory exact match (+15 pts)
      if (
        candidate.subcategory_id &&
        targetPost.subcategory_id &&
        candidate.subcategory_id === targetPost.subcategory_id
      ) {
        score += 15;
        reasons.push('Exact subcategory');
      }
    }

    // 2. Geographic Proximity (up to 30 pts)
    if (candidate.wilaya_id === targetPost.wilaya_id) {
      score += 20;
      reasons.push('Same Wilaya');

      if (
        candidate.commune_id &&
        targetPost.commune_id &&
        candidate.commune_id === targetPost.commune_id
      ) {
        score += 10;
        reasons.push('Same Commune');
      }
    }

    // 3. Keyword / Token Overlap (up to 20 pts)
    const candidateTokens = [
      ...normalizeTokens(candidate.title),
      ...normalizeTokens(candidate.description),
    ];

    let sharedKeywords = 0;
    for (const token of candidateTokens) {
      if (targetTokens.has(token)) {
        sharedKeywords++;
      }
    }

    if (sharedKeywords > 0) {
      const keywordScore = Math.min(20, sharedKeywords * 7);
      score += keywordScore;
      reasons.push(`${sharedKeywords} matching keyword(s)`);
    }

    // Threshold check: must meet meaningful similarity
    if (score >= 45) {
      results.push({
        post: candidate,
        score: Math.min(100, score),
        reasons,
      });
    }
  }

  // Sort by highest score first
  return results.sort((a, b) => b.score - a.score);
}
