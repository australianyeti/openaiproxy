import { GoogleGenerativeAIResponseError } from "./errors.ts"
import {
  type EnhancedGenerateContentResponse,
  FinishReason,
  type GenerateContentCandidate,
  type GenerateContentResponse,
} from "./types.ts"

/**
 * Adds convenience helper methods to a response object, including stream
 * chunks (as long as each chunk is a complete GenerateContentResponse JSON).
 */
export function addHelpers(response: GenerateContentResponse): EnhancedGenerateContentResponse {
  ;(response as EnhancedGenerateContentResponse).text = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(
          `This response had ${response.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`,
        )
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError<GenerateContentResponse>(
          `${formatBlockErrorMessage(response)}`,
          response,
        )
      }
      return getText(response)
    }
    if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError<GenerateContentResponse>(
        `Text not available. ${formatBlockErrorMessage(response)}`,
        response,
      )
    }
    return ""
  }
  return response as EnhancedGenerateContentResponse
}

/**
 * Returns text of first candidate.
 */
function getText(response: GenerateContentResponse): string {
  if (response.candidates?.[0].content?.parts?.[0]?.text) {
    return response.candidates[0].content.parts[0].text
  }
  return ""
}

const badFinishReasons = [FinishReason.RECITATION, FinishReason.SAFETY]

function hadBadFinishReason(candidate: GenerateContentCandidate): boolean {
  return !!candidate.finishReason && badFinishReasons.includes(candidate.finishReason)
}

function formatBlockErrorMessage(response: GenerateContentResponse): string {
  let message = ""
  if ((!response.candidates || response.candidates.length === 0) && response.promptFeedback) {
    message += "Response was blocked"
    if (response.promptFeedback?.blockReason) {
      message += ` due to ${response.promptFeedback.blockReason}`
    }
    if (response.promptFeedback?.blockReasonMessage) {
      message += `: ${response.promptFeedback.blockReasonMessage}`
    }
  } else if (response.candidates?.[0]) {
    const firstCandidate = response.candidates[0]
    if (hadBadFinishReason(firstCandidate)) {
      message += `Candidate was blocked due to ${firstCandidate.finishReason}`
      if (firstCandidate.finishMessage) {
        message += `: ${firstCandidate.finishMessage}`
      }
    }
  }
  return message
}
