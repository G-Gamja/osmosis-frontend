import styled from '@emotion/styled';
import { Dec, IntPretty } from '@keplr-wallet/unit';
import { PricePretty } from '@keplr-wallet/unit/build/price-pretty';
import { observer } from 'mobx-react-lite';
import React, { FunctionComponent, useState } from 'react';
import { Img } from 'src/components/common/Img';
import { ButtonPrimary } from 'src/components/layouts/Buttons';
import { CenterSelf } from 'src/components/layouts/Containers';
import { TitleText, Text } from 'src/components/Texts';
import { ExtraGaugeInPool } from 'src/config';
import { LockLpTokenDialog } from 'src/dialogs';
import useWindowSize from 'src/hooks/useWindowSize';
import { useStore } from 'src/stores';
import { SuperfluidStaking } from '../SuperfluidStaking';
import { ExtraGauge } from './ExtraGauge';
import { MyBondingsTable } from './MyBondingsTable';
import { MyUnBondingTable } from './MyUnbondingTable';

interface Props {
	poolId: string;
	isSuperfluidEnabled: boolean;
}

export const LiquidityMining = observer(function LiquidityMining({ poolId, isSuperfluidEnabled }: Props) {
	const { chainStore, queriesStore, accountStore, priceStore } = useStore();

	const { isMobileView } = useWindowSize();

	const account = accountStore.getAccount(chainStore.current.chainId);
	const queries = queriesStore.get(chainStore.current.chainId);

	const poolTotalValueLocked =
		queries.osmosis.queryGammPools
			.getPool(poolId)
			?.computeTotalValueLocked(priceStore, priceStore.getFiatCurrency('usd')!) ??
		new PricePretty(priceStore.getFiatCurrency('usd')!, new Dec(0));
	const totalPoolShare = queries.osmosis.queryGammPools.getPool(poolId)?.totalShare ?? new IntPretty(new Dec(0));
	const myPoolShare = queries.osmosis.queryGammPoolShare.getAvailableGammShare(account.bech32Address, poolId);
	const lockableDurations = queries.osmosis.queryLockableDurations.lockableDurations;

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const closeDialog = () => setIsDialogOpen(false);

	return (
		<>
			<LiquidityMiningContainer>
				<LockLpTokenDialog
					isOpen={isDialogOpen}
					close={closeDialog}
					poolId={poolId}
					isSuperfluidEnabled={isSuperfluidEnabled}
				/>
				<LiquidityMiningSummary>
					<div>
						<div className="pb-4 flex gap-3 items-center">
							<TitleText isMobileView={isMobileView} pb={0} weight="semiBold">
								Liquidity Mining
							</TitleText>
							{isSuperfluidEnabled && (
								<button className="bg-sfs rounded-full px-4 py-1">Superfluid Staking Enabled</button>
							)}
						</div>
						<Text isMobileView={isMobileView}>
							Bond liquidity to various minimum unbonding period to earn
							{!isMobileView ? <br /> : ' '}
							OSMO liquidity reward and swap fees
						</Text>
					</div>
					<AvailableLpColumn>
						<Text isMobileView={isMobileView} pb={12}>
							Available LP tokens
						</Text>
						<Text isMobileView={isMobileView} pb={16} size="xl" emphasis="high" weight="semiBold">
							{/* TODO: 풀의 TVL을 계산할 수 없는 경우 그냥 코인 그대로 보여줘야할듯... */}
							{!totalPoolShare.toDec().equals(new Dec(0))
								? poolTotalValueLocked.mul(myPoolShare.quo(totalPoolShare)).toString()
								: '$0'}
						</Text>
						<div>
							<ButtonPrimary
								onClick={() => {
									setIsDialogOpen(true);
								}}>
								<Text isMobileView={isMobileView} emphasis="high">
									Start Earning
								</Text>
							</ButtonPrimary>
						</div>
					</AvailableLpColumn>
				</LiquidityMiningSummary>
				{(() => {
					let gauges = ExtraGaugeInPool[poolId];
					if (gauges) {
						if (!Array.isArray(gauges)) {
							gauges = [gauges];
						}

						return (
							<div
								style={{
									display: 'flex',
									flexDirection: isMobileView ? 'column' : 'row',
									gap: isMobileView ? '0px' : '36px',
								}}>
								{gauges.map(gauge => {
									const currency = chainStore.currentFluent.findCurrency(gauge.denom);
									const gaugeIds = [gauge.gaugeId];
									if (Array.isArray(gauges)) {
										for (const other of gauges) {
											if (other.gaugeId !== gauge.gaugeId) {
												gaugeIds.push(other.gaugeId);
											}
										}
									}

									if (currency) {
										return (
											<ExtraGauge gaugeIds={gaugeIds} currency={currency} extraRewardAmount={gauge.extraRewardAmount} />
										);
									}
								})}
							</div>
						);
					}
					return null;
				})()}
				<LockDurationSection>
					{lockableDurations.map((lockableDuration, i) => {
						return (
							<LockupBox
								key={i.toString()}
								apy={`${queries.osmosis.queryIncentivizedPools
									.computeAPY(poolId, lockableDuration, priceStore, priceStore.getFiatCurrency('usd')!)
									.toString()}%`}
								duration={lockableDuration.humanize()}
								isMobileView={isMobileView}
								isSuperfluidEnabled={i === lockableDurations.length - 1 && isSuperfluidEnabled}
							/>
						);
					})}
				</LockDurationSection>
			</LiquidityMiningContainer>
			{isSuperfluidEnabled && <SuperfluidStaking />}
			<TableSection className="mt-10">
				<MyBondingsTable poolId={poolId} isSuperfluidEnabled={isSuperfluidEnabled} />
			</TableSection>
			<TableSection>
				<MyUnBondingTable poolId={poolId} />
			</TableSection>
		</>
	);
});

const LockupBox: FunctionComponent<{
	duration: string;
	apy: string;
	isMobileView: boolean;
	isSuperfluidEnabled?: boolean;
}> = ({ duration, apy, isMobileView, isSuperfluidEnabled }) => {
	return (
		<div className={`w-full rounded-xl py-0.5 px-0.5 ${isSuperfluidEnabled ? 'bg-sfs' : 'bg-card'}`}>
			<div className="rounded-xl bg-card py-4 px-5.5 md:py-5.5 md:px-7">
				<div className="pb-4 flex items-center gap-2">
					<TitleText isMobileView={isMobileView} pb={0} weight="medium">
						{duration} unbonding
					</TitleText>
					{isSuperfluidEnabled && (
						<div className="w-6 h-6">
							<Img src={'/public/assets/Icons/superfluid-osmo.svg'} />
						</div>
					)}
				</div>
				<Text isMobileView={isMobileView} color="gold" size="lg">
					APR {apy}
					{isSuperfluidEnabled && ` + 29%`}
				</Text>
			</div>
		</div>
	);
};

const LiquidityMiningContainer = styled(CenterSelf)`
	padding: 20px 20px 28px;
	@media (min-width: 768px) {
		padding: 40px 0;
	}
`;

const LiquidityMiningSummary = styled.div`
	display: flex;
	flex-direction: column;
	gap: 32px;
	@media (min-width: 768px) {
		flex-direction: row;
		justify-content: space-between;
		gap: 0;
	}
`;

const AvailableLpColumn = styled.div`
	display: flex;
	flex-direction: column;
	align-item: flex-start;
	@media (min-width: 768px) {
		align-items: flex-end;
	}
`;

const LockDurationSection = styled.div`
	margin-top: 40px;
	display: flex;
	flex-wrap: wrap;
	gap: 16px;
	@media (min-width: 768px) {
		flex-wrap: nowrap;
		gap: 36px;
	}
`;

const TableSection = styled.div`
	padding-bottom: 20px;
`;
