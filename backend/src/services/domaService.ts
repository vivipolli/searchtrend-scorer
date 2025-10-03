import axios, { AxiosResponse } from 'axios';
import { config } from '@/config';
import logger from '@/utils/logger';
import { DomaEvent, Domain } from '@/types';

interface DomaApiDomain {
  name: string;
  tokens?: {
    tokenId?: string;
    networkId?: string;
    ownerAddress?: string;
    createdAt?: string;
    expiresAt?: string;
    tokenAddress?: string;
    chain?: {
      name: string;
      networkId: string;
    } | null;
  }[] | null;
}

class DomaService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.domaApi.baseUrl;
    this.apiKey = config.domaApi.apiKey;
  }

  private getHeaders(): Record<string, string> {
    return this.apiKey ? { 'Api-Key': this.apiKey } : {};
  }

  /**
   * Poll for new DOMA events
   */
  async pollEvents(limit: number = 25, finalizedOnly: boolean = true): Promise<{
    events: DomaEvent[];
    lastId?: number;
    hasMoreEvents?: boolean;
  }> {
    try {
      const url = `${this.baseUrl}/v1/poll`;
      const headers = this.getHeaders();
      const params = { limit, finalizedOnly };

      logger.debug(`Polling DOMA events from ${url}`, { limit, finalizedOnly });

      const response: AxiosResponse = await axios.get(url, {
        headers,
        params,
        timeout: 30000, // 30 seconds timeout
      });

      const data = response.data || {};
      const events = Array.isArray(data.events) ? data.events : [];

      logger.info(`Successfully polled ${events.length} events from DOMA API`);

      return {
        events,
        lastId: data.lastId,
        hasMoreEvents: data.hasMoreEvents,
      };
    } catch (error) {
      logger.error('Failed to poll DOMA events:', error);
      throw new Error(`DOMA API polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Acknowledge processed events
   */
  async acknowledgeEvents(lastId: number): Promise<void> {
    try {
      const ackUrl = `${this.baseUrl}/v1/poll/ack/${lastId}`;
      const headers = this.getHeaders();

      await axios.post(ackUrl, null, {
        headers,
        timeout: 10000, // 10 seconds timeout
      });

      logger.debug(`Successfully acknowledged events up to ID: ${lastId}`);
    } catch (error) {
      logger.error(`Failed to acknowledge events for ID ${lastId}:`, error);
      // Don't throw here as acknowledgment failure shouldn't stop processing
    }
  }

  /**
   * Query domains using GraphQL API
   */
  async queryDomains(params: {
    skip?: number;
    take?: number;
    ownedBy?: string[];
    claimStatus?: 'CLAIMED' | 'UNCLAIMED' | 'ALL';
    name?: string;
    networkIds?: string[];
    tlds?: string[];
  } = {}): Promise<{
    data: Domain[];
    total: number;
  }> {
    try {
      const url = `${this.baseUrl}/graphql`;
      const headers = this.getHeaders();

      const query = `
        query GetNames(
          $skip: Int
          $take: Int
          $ownedBy: [AddressCAIP10!]
          $claimStatus: NamesQueryClaimStatus
          $name: String
          $networkIds: [String!]
          $tlds: [String!]
        ) {
          names(
            skip: $skip
            take: $take
            ownedBy: $ownedBy
            claimStatus: $claimStatus
            name: $name
            networkIds: $networkIds
            tlds: $tlds
          ) {
            items {
              name
              tokens {
                tokenId
                networkId
                ownerAddress
                createdAt
                expiresAt
                tokenAddress
                chain {
                  name
                  networkId
                }
              }
            }
            totalCount
          }
        }
      `;

      const variables = {
        skip: params.skip || 0,
        take: params.take || 100,
        ownedBy: params.ownedBy || undefined,
        claimStatus: params.claimStatus || 'ALL',
        name: params.name || undefined,
        networkIds: params.networkIds || undefined,
        tlds: params.tlds || undefined,
      };

      logger.info('Querying DOMA GraphQL API for domains', { 
        domainName: variables.name,
        variables 
      });

      const response: AxiosResponse = await axios.post(url, {
        query,
        variables,
      }, {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      logger.info('DOMA GraphQL API response', {
        status: response.status,
        hasData: !!response.data?.data,
        hasNames: !!response.data?.data?.names,
        itemsCount: response.data?.data?.names?.items?.length || 0
      });

      const result = response.data?.data?.names;
      if (!result) {
        throw new Error('Invalid GraphQL response structure');
      }

      logger.info(`Successfully queried ${result.items.length} domains from DOMA GraphQL API`);

      // Map API response to Domain objects
      const domains: Domain[] = result.items.map((item: DomaApiDomain) => {
        const now = new Date();
        // Use the first token if multiple tokens exist
        const token = item.tokens && item.tokens.length > 0 ? item.tokens[0] : null;
        return {
          id: item.name,
          name: item.name,
          tokenId: token?.tokenId ?? null,
          owner: token?.ownerAddress ?? null,
          claimStatus: token?.ownerAddress ? 'CLAIMED' : 'UNCLAIMED',
          networkId: token?.networkId ?? 'unknown',
          tokenAddress: token?.tokenAddress ?? null,
          createdAt: token?.createdAt ? new Date(token.createdAt) : now,
          updatedAt: token?.expiresAt ? new Date(token.expiresAt) : now,
          mintedAt: token?.createdAt ? new Date(token.createdAt) : null,
          lastActivityAt: token?.expiresAt ? new Date(token.expiresAt) : null,
        };
      });

      return {
        data: domains,
        total: result.totalCount,
      };
    } catch (error) {
      logger.error('Failed to query DOMA GraphQL API:', error);
      
      // Check if it's an Axios error with response data
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data) {
          logger.error('GraphQL API error response:', axiosError.response.data);
        }
      }
      
      throw new Error(`DOMA GraphQL query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get domain details by name
   */
  async getDomainByName(domainName: string): Promise<Domain | null> {
    try {
      // Validate domain name format
      if (!domainName || typeof domainName !== 'string' || domainName.trim() === '') {
        logger.warn(`Invalid domain name provided: ${domainName}`);
        return null;
      }

      const result = await this.queryDomains({
        name: domainName.trim(),
        take: 1,
      });

      return result.data.length > 0 ? result.data[0] ?? null : null;
    } catch (error) {
      logger.error(`Failed to get domain ${domainName}:`, error);
      return null;
    }
  }

  /**
   * Get domains by owner
   */
  async getDomainsByOwner(ownerAddress: string, limit: number = 100): Promise<Domain[]> {
    try {
      const result = await this.queryDomains({
        ownedBy: [ownerAddress],
        take: limit,
      });

      return result.data;
    } catch (error) {
      logger.error(`Failed to get domains for owner ${ownerAddress}:`, error);
      return [];
    }
  }

  /**
   * Get domains by TLD
   */
  async getDomainsByTLD(tld: string, limit: number = 100): Promise<Domain[]> {
    try {
      const result = await this.queryDomains({
        tlds: [tld],
        take: limit,
      });

      return result.data;
    } catch (error) {
      logger.error(`Failed to get domains for TLD ${tld}:`, error);
      return [];
    }
  }

  /**
   * Extract price from event data
   */
  extractPriceFromEvent(event: DomaEvent): number | null {
    try {
      const payment = event.eventData?.payment;
      if (payment && typeof payment.price === 'string') {
        const parsed = Number(payment.price);
        return !Number.isNaN(parsed) ? parsed : null;
      }
      return null;
    } catch (error) {
      logger.warn(`Failed to extract price from event ${event.id}:`, error);
      return null;
    }
  }

  /**
   * Extract network ID from event data
   */
  extractNetworkIdFromEvent(event: DomaEvent): string | null {
    return event.eventData?.networkId || null;
  }

  /**
   * Extract token address from event data
   */
  extractTokenAddressFromEvent(event: DomaEvent): string | null {
    return event.eventData?.tokenAddress || null;
  }

  /**
   * Extract token ID from event data
   */
  extractTokenIdFromEvent(event: DomaEvent): string | null {
    return event.eventData?.tokenId || null;
  }

  /**
   * Health check for DOMA API
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.queryDomains({ take: 1 });
      return true;
    } catch (error) {
      logger.error('DOMA API health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const domaService = new DomaService();
export default domaService;
