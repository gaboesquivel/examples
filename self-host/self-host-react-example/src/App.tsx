import React, { useEffect, useState } from 'react';
import './App.css';
import swal from 'sweetalert';
import ThresholdKey from '@tkey/default';
import WebStorageModule from '@tkey/web-storage';
import SecurityQuestionsModule from '@tkey/security-questions';

function App() {
	const [user, setUser] = useState<any>(null);
	const [privateKey, setPrivateKey] = useState<any>();
	const [tKey, setTKey] = useState<ThresholdKey | null>(null);

	// Init Service Provider inside the useEffect Method
	useEffect(() => {
		const init = async () => {
			// Configuration of Service Provider
			const customAuthArgs = {
				baseUrl: `${window.location.origin}/serviceworker`,
				network: 'cyan',
			};
			// Configuration of Modules
			const webStorageModule = new WebStorageModule(); // For 2/2
			const securityQuestionsModule = new SecurityQuestionsModule(); // For 2/3

			// Instantiation of tKey
			const tKey = new ThresholdKey({
				modules: {
					webStorage: webStorageModule,
					securityQuestions: securityQuestionsModule,
				},
				customAuthArgs: customAuthArgs as any,
			});
			setTKey(tKey);
			// Initialization of Service Provider
			await (tKey.serviceProvider as any).init();
			try {
			} catch (error) {
				uiConsole(error);
			}
		};
		init();
	}, []);

	const triggerLogin = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		try {
			// Triggering Login using Service Provider ==> opens the popup
			const loginResponse = await (tKey.serviceProvider as any).triggerLogin({
				typeOfLogin: 'google',
				verifier: 'google-tkey-w3a',
				clientId:
					'774338308167-q463s7kpvja16l4l0kko3nb925ikds2p.apps.googleusercontent.com',
			});
			setUser(loginResponse.userInfo);
			uiConsole('Public Key : ' + loginResponse.publicAddress);
			uiConsole('Email : ' + loginResponse.userInfo.email);
		} catch (error) {
			uiConsole(error);
		}
	};

	const initializeNewKey = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		try {
			await triggerLogin(); // Calls the triggerLogin() function above
			// Initialization of tKey
			await tKey.initialize(); // 1/2 flow
			// Gets the deviceShare
			try {
				await (tKey.modules.webStorage as WebStorageModule).inputShareFromWebStorage(); // 2/2 flow
			} catch (e) {
				uiConsole(e);
				await recoverShare();
			}

			// Checks the requiredShares to reconstruct the tKey,
			// starts from 2 by default and each of the above share reduce it by one.
			const { requiredShares } = tKey.getKeyDetails();
			if (requiredShares <= 0) {
				const reconstructedKey = await tKey.reconstructKey();
				setPrivateKey(reconstructedKey?.privKey.toString("hex"))
				uiConsole(
					'Private Key: ' + reconstructedKey.privKey.toString("hex"),
				);
			}
		} catch (error) {
			uiConsole(error, 'caught');
		}
	};

	const changeSecurityQuestionAndAnswer = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		// swal is just a pretty dialog box
		swal('Enter password (>10 characters)', {
			content: 'input' as any,
		}).then(async value => {
			if (value.length > 10) {
				await (
					tKey.modules.securityQuestions as SecurityQuestionsModule
				).changeSecurityQuestionAndAnswer(value, 'whats your password?');
				swal('Success', 'Successfully changed new share with password.', 'success');
				uiConsole('Successfully changed new share with password.');
			} else {
				swal('Error', 'Password must be >= 11 characters', 'error');
			}
		});
		const keyDetails = await tKey.getKeyDetails();
		uiConsole(keyDetails);
	};

	const generateNewShareWithPassword = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		// swal is just a pretty dialog box
		swal('Enter password (>10 characters)', {
			content: 'input' as any,
		}).then(async value => {
			if (value.length > 10) {
				try {
					await (
						tKey.modules.securityQuestions as SecurityQuestionsModule
					).generateNewShareWithSecurityQuestions(
						value,
						'whats your password?',
					);
					swal('Success', 'Successfully generated new share with password.', 'success');
					uiConsole('Successfully generated new share with password.');
				} catch (error) {
					swal('Error', (error as any)?.message.toString(), 'error');
				}
			} else {
				swal('Error', 'Password must be >= 11 characters', 'error');
			}
		});
	}

	const recoverShare = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		// swal is just a pretty dialog box
		swal('Enter password (>10 characters)', {
			content: 'input' as any,
		}).then(async value => {
			if (value.length > 10) {
				try {
					await (tKey.modules.securityQuestions as SecurityQuestionsModule).inputShareFromSecurityQuestions(value); // 2/2 flow
					const { requiredShares } = tKey.getKeyDetails();
					if (requiredShares <= 0) {
						const reconstructedKey = await tKey.reconstructKey();
						setPrivateKey(reconstructedKey?.privKey.toString("hex"))
						uiConsole(
							'Private Key: ' + reconstructedKey.privKey.toString("hex"),
						);
					}
					const shareStore = await tKey.generateNewShare();
					await (tKey.modules.webStorage as WebStorageModule).storeDeviceShare(shareStore.newShareStores[1]);
					swal('Success', 'Successfully logged you in with the recovery password.', 'success');
					uiConsole('Successfully logged you in with the recovery password.');
				} catch (error) {
					swal('Error', (error as any)?.message.toString(), 'error');
					uiConsole(error);
					logout();
				}
			} else {
				swal('Error', 'Password must be >= 11 characters', 'error');
				logout();
			}
		});
	}

	const keyDetails = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		const keyDetails = await tKey.getKeyDetails();
		uiConsole(keyDetails);
	};

	const logout = (): void => {
		uiConsole('Log out');
		setUser(null);
	};

	const getUserInfo = (): void => {
		uiConsole(user);
	};

	const getPrivateKey = (): void => {
		uiConsole(privateKey);
	};

	const uiConsole = (...args: any[]): void => {
		const el = document.querySelector('#console>p');
		if (el) {
			el.innerHTML = JSON.stringify(args || {}, null, 2);
		}
	};

	const loggedInView = (
		<>
			<div className='flex-container'>
				<div>
					<button onClick={getUserInfo} className='card'>
						Get User Info
					</button>
				</div>
				<div>
					<button onClick={generateNewShareWithPassword} className='card'>
						Generate Password Share
					</button>
				</div>
				<div>
					<button onClick={changeSecurityQuestionAndAnswer} className='card'>
						Change Password Share
					</button>
				</div>
				<div>
					<button onClick={keyDetails} className='card'>
						Key Details
					</button>
				</div>
				<div>
					<button onClick={getPrivateKey} className='card'>
						Private Key
					</button>
				</div>
				{/* <div>
					<button onClick={getChainId} className='card'>
						Get Chain ID
					</button>
				</div>
				<div>
					<button onClick={getAccounts} className='card'>
						Get Accounts
					</button>
				</div>
				<div>
					<button onClick={getBalance} className='card'>
						Get Balance
					</button>
				</div>
				<div>
					<button onClick={signMessage} className='card'>
						Sign Message
					</button>
				</div>
				<div>
					<button onClick={sendTransaction} className='card'>
						Send Transaction
					</button>
				</div> */}

				<div>
					<button onClick={logout} className='card'>
						Log Out
					</button>
				</div>
			</div>

			<div id='console' style={{ whiteSpace: 'pre-line' }}>
				<p style={{ whiteSpace: 'pre-line' }}></p>
			</div>
		</>
	);

	const unloggedInView = (
		<button onClick={initializeNewKey} className='card'>
			Login
		</button>
	);

	return (
		<div className='container'>
			<h1 className='title'>
				<a target='_blank' href='http://web3auth.io/' rel='noreferrer'>
					Web3Auth (tKey)
				</a>
				& ReactJS Ethereum Example
			</h1>

			<div className='grid'>{user ? loggedInView : unloggedInView}</div>

			<footer className='footer'>
				<a
					href='https://github.com/Web3Auth/examples/tree/main/self-host/self-host-react-example'
					target='_blank'
					rel='noopener noreferrer'
				>
					Source code
				</a>
			</footer>
		</div>
	);
}

export default App;
